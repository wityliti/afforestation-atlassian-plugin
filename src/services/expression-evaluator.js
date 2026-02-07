/**
 * Expression Evaluator Service
 * 
 * Safe evaluator for scoring expressions per spec section 4.2
 * Only allows whitelisted operators and variables.
 */

/**
 * Allowed operators for expressions
 */
const ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '??'];
const ALLOWED_FUNCTIONS = ['min', 'max'];

/**
 * Evaluate a scoring expression safely
 * @param {string} expression - Expression like "base + (storyPoints ?? 0) * spMult + 15"
 * @param {object} variables - Available variables { base, spMult, storyPoints, issueTypeWeight }
 * @returns {number}
 */
export function evaluateExpression(expression, variables) {
    if (!expression || typeof expression !== 'string') {
        throw new Error('Expression must be a non-empty string');
    }

    // Validate and sanitize expression
    const sanitized = sanitizeExpression(expression);

    // Replace variables with values
    const substituted = substituteVariables(sanitized, variables);

    // Parse and evaluate
    return evaluate(substituted);
}

/**
 * Sanitize expression - remove/validate dangerous patterns
 * @param {string} expression 
 * @returns {string}
 */
function sanitizeExpression(expression) {
    // Remove whitespace for easier parsing
    let clean = expression.replace(/\s+/g, '');

    // Check for forbidden patterns
    const forbidden = [
        /[;{}[\]]/,           // Block structures
        /function/i,          // Function declarations
        /=>/,                  // Arrow functions
        /eval|exec|import|require/i,  // Dynamic execution
        /\.\w+\(/,            // Method calls
        /\[['"`]/,            // Property access with strings
    ];

    for (const pattern of forbidden) {
        if (pattern.test(clean)) {
            throw new Error(`Forbidden pattern in expression: ${expression}`);
        }
    }

    // Validate only allowed characters
    const allowedChars = /^[a-zA-Z0-9_+\-*/()??,. ]+$/;
    if (!allowedChars.test(expression)) {
        throw new Error(`Invalid characters in expression: ${expression}`);
    }

    return expression;
}

/**
 * Substitute variables with their values
 * @param {string} expression 
 * @param {object} variables 
 * @returns {string}
 */
function substituteVariables(expression, variables) {
    let result = expression;

    // Define available variables with defaults
    const vars = {
        base: variables.base ?? 10,
        spMult: variables.spMult ?? 5,
        storyPoints: variables.storyPoints ?? 0,
        issueTypeWeight: variables.issueTypeWeight ?? 1.0
    };

    // Replace each variable with its value
    for (const [name, value] of Object.entries(vars)) {
        // Use word boundary matching to avoid partial replacements
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        result = result.replace(regex, String(value));
    }

    return result;
}

/**
 * Evaluate a numeric expression
 * @param {string} expression 
 * @returns {number}
 */
function evaluate(expression) {
    // Handle null coalescing (??) operator
    expression = handleNullCoalescing(expression);

    // Handle min/max functions
    expression = handleFunctions(expression);

    // Validate it's now a pure numeric expression
    const numericExpr = /^[\d+\-*/().]+$/;
    if (!numericExpr.test(expression.replace(/\s/g, ''))) {
        throw new Error(`Expression contains invalid tokens after substitution: ${expression}`);
    }

    // Evaluate using Function (safer than eval with validated input)
    try {
        const result = new Function(`return (${expression})`)();

        if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
            throw new Error(`Expression did not evaluate to a valid number: ${expression}`);
        }

        return result;
    } catch (error) {
        throw new Error(`Failed to evaluate expression: ${expression} - ${error.message}`);
    }
}

/**
 * Handle null coalescing operator (??)
 * @param {string} expression 
 * @returns {string}
 */
function handleNullCoalescing(expression) {
    // Simple implementation: replace "a ?? b" with "(a || b)"
    // This isn't perfect but works for our use case with numbers
    return expression.replace(/(\w+)\s*\?\?\s*(\d+)/g, '($1 || $2)');
}

/**
 * Handle min/max function calls
 * @param {string} expression 
 * @returns {string}
 */
function handleFunctions(expression) {
    // Handle min(a, b)
    expression = expression.replace(/min\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => {
        return `Math.min(${a}, ${b})`;
    });

    // Handle max(a, b)
    expression = expression.replace(/max\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => {
        return `Math.max(${a}, ${b})`;
    });

    return expression;
}

/**
 * Validate an expression without evaluating
 * @param {string} expression 
 * @returns {{ valid: boolean, error: string }}
 */
export function validateExpression(expression) {
    try {
        sanitizeExpression(expression);

        // Try evaluation with dummy values
        const dummyVars = {
            base: 10,
            spMult: 5,
            storyPoints: 3,
            issueTypeWeight: 1.0
        };

        evaluateExpression(expression, dummyVars);

        return { valid: true, error: null };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}
