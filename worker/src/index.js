/**
 * Cloudflare Worker for Milo Beckman Email Signup Backend
 *
 * Routes:
 * - POST /api/signup - Email signup endpoint
 * - GET /admin-panel-xyz - Admin panel (serves HTML from /admin directory)
 * - GET /admin-panel-xyz/api/signups - API endpoint for signups data (JSON)
 * - GET /admin-panel-xyz/export - Export signups as CSV
 * - GET /admin-panel-xyz/* - Serve static admin files
 */

import setupHTML from '../admin/setup.html';
import panelHTML from '../admin/panel.html';
import adminCSS from '../admin/admin-styles.css';

// Rate limiting configuration (in-memory, resets on worker restart)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 signups per minute per IP

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // In production, restrict this to your domain
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Route: Email Signup API
			if (url.pathname === '/api/signup' && request.method === 'POST') {
				return await handleSignup(request, env, corsHeaders);
			}

			// Route: Admin static files (CSS)
			if (url.pathname === '/admin-panel-xyz/admin-styles.css') {
				return new Response(adminCSS, {
					headers: { 'Content-Type': 'text/css' }
				});
			}

			// Route: Admin API - Get signups data (JSON)
			if (url.pathname === '/admin-panel-xyz/api/signups') {
				return await handleGetSignups(request, env);
			}

			// Route: Admin Panel main page (GET - show interface, POST - setup)
			if (url.pathname === '/admin-panel-xyz') {
				return await handleAdmin(request, env);
			}

			// Route: Export CSV
			if (url.pathname === '/admin-panel-xyz/export') {
				return await handleExport(request, env);
			}

			// Default 404
			return new Response('Not Found', { status: 404 });

		} catch (error) {
			console.error('Worker error:', error);
			return new Response(JSON.stringify({ error: 'Internal server error' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	}
};

/**
 * Handle email signup submissions
 */
async function handleSignup(request, env, corsHeaders) {
	// Rate limiting by IP
	const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
	if (!checkRateLimit(clientIP)) {
		return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
			status: 429,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	// Parse request body
	let data;
	try {
		data = await request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	// Validate input
	const { first_name, last_name, email } = data;

	if (!first_name || !last_name || !email) {
		return new Response(JSON.stringify({ error: 'All fields are required' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	// Sanitize inputs
	const sanitizedFirstName = sanitizeInput(first_name);
	const sanitizedLastName = sanitizeInput(last_name);
	const sanitizedEmail = email.trim().toLowerCase();

	// Validate email format
	if (!isValidEmail(sanitizedEmail)) {
		return new Response(JSON.stringify({ error: 'Invalid email address' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	// Insert into database
	try {
		await env.DB.prepare(
			'INSERT INTO signups (first_name, last_name, email) VALUES (?, ?, ?)'
		).bind(sanitizedFirstName, sanitizedLastName, sanitizedEmail).run();

		return new Response(JSON.stringify({
			success: true,
			message: 'Successfully subscribed!'
		}), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		// Check for duplicate email (UNIQUE constraint violation)
		if (error.message && error.message.includes('UNIQUE constraint failed')) {
			return new Response(JSON.stringify({ error: 'This email is already subscribed' }), {
				status: 409,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		console.error('Database error:', error);
		return new Response(JSON.stringify({ error: 'Failed to save signup' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin panel - authentication and display
 */
async function handleAdmin(request, env) {
	// Check if admin password is set
	const adminExists = await env.DB.prepare(
		'SELECT id FROM admin_credentials WHERE id = 1'
	).first();

	// If no admin password exists, show setup page
	if (!adminExists && request.method === 'GET') {
		return new Response(setupHTML, {
			headers: { 'Content-Type': 'text/html' }
		});
	}

	// Handle initial password setup
	if (!adminExists && request.method === 'POST') {
		const formData = await request.formData();
		const setupPassword = formData.get('setup_password');

		if (!setupPassword || setupPassword.length < 8) {
			return new Response(setupHTML, {
				status: 400,
				headers: { 'Content-Type': 'text/html' }
			});
		}

		// Hash and store password
		const passwordHash = await hashPassword(setupPassword);
		await env.DB.prepare(
			'INSERT INTO admin_credentials (id, password_hash) VALUES (1, ?)'
		).bind(passwordHash).run();

		// Return success response
		return new Response('Password set successfully!', {
			status: 200,
			headers: { 'Content-Type': 'text/plain' }
		});
	}

	// Admin password exists - check authentication for GET requests
	if (request.method === 'GET') {
		const authHeader = request.headers.get('Authorization');

		if (!authHeader) {
			return unauthorizedResponse();
		}

		// Verify password
		if (!(await verifyAuth(authHeader, env))) {
			return unauthorizedResponse();
		}

		// Authenticated - show admin panel HTML
		return new Response(panelHTML, {
			headers: { 'Content-Type': 'text/html' }
		});
	}

	return new Response('Method not allowed', { status: 405 });
}

/**
 * Handle get signups API (JSON endpoint for admin panel)
 */
async function handleGetSignups(request, env) {
	// Check authentication
	const authHeader = request.headers.get('Authorization');

	if (!authHeader) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Verify password
	if (!(await verifyAuth(authHeader, env))) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Fetch signups
	const signups = await env.DB.prepare(
		'SELECT id, first_name, last_name, email, created_at FROM signups ORDER BY created_at DESC'
	).all();

	return new Response(JSON.stringify({ signups: signups.results }), {
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Handle CSV export
 */
async function handleExport(request, env) {
	// Check authentication
	const authHeader = request.headers.get('Authorization');

	if (!authHeader) {
		return unauthorizedResponse();
	}

	// Verify password
	if (!(await verifyAuth(authHeader, env))) {
		return unauthorizedResponse();
	}

	// Fetch all signups
	const signups = await env.DB.prepare(
		'SELECT id, first_name, last_name, email, created_at FROM signups ORDER BY created_at DESC'
	).all();

	// Generate CSV
	let csv = 'ID,First Name,Last Name,Email,Subscribed Date\n';
	for (const signup of signups.results) {
		csv += `${signup.id},"${escapeCSV(signup.first_name)}","${escapeCSV(signup.last_name)}","${signup.email}","${signup.created_at}"\n`;
	}

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="signups-${new Date().toISOString().split('T')[0]}.csv"`
		}
	});
}

/**
 * Utility Functions
 */

async function verifyAuth(authHeader, env) {
	try {
		const base64Credentials = authHeader.split(' ')[1];
		const credentials = atob(base64Credentials);
		const [username, password] = credentials.split(':');

		const admin = await env.DB.prepare(
			'SELECT password_hash FROM admin_credentials WHERE id = 1'
		).first();

		if (!admin) {
			return false;
		}

		return await verifyPassword(password, admin.password_hash);
	} catch (e) {
		return false;
	}
}

function checkRateLimit(ip) {
	const now = Date.now();
	const userLimits = rateLimits.get(ip) || [];

	// Remove old entries outside the time window
	const validLimits = userLimits.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

	if (validLimits.length >= MAX_REQUESTS_PER_WINDOW) {
		return false;
	}

	validLimits.push(now);
	rateLimits.set(ip, validLimits);
	return true;
}

function sanitizeInput(str) {
	return str.trim().substring(0, 100); // Limit length and trim whitespace
}

function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email) && email.length <= 254;
}

async function hashPassword(password) {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function verifyPassword(password, hash) {
	const passwordHash = await hashPassword(password);
	return passwordHash === hash;
}

function escapeCSV(str) {
	return str.replace(/"/g, '""');
}

function unauthorizedResponse() {
	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="Admin Panel"'
		}
	});
}
