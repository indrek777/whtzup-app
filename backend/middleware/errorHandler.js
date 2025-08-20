const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    statusCode = 400;
    message = 'Referenced resource not found';
  } else if (err.code === '42P01') { // PostgreSQL undefined table
    statusCode = 500;
    message = 'Database schema error';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service unavailable';
  } else if (err.status) {
    statusCode = err.status;
    message = err.message;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    details = err.stack;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

module.exports = { errorHandler };
