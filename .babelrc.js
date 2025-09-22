module.exports = {
  presets: ['next/babel'],
  plugins: [
    // Remove console logs in production, but keep console.error and console.warn
    process.env.NODE_ENV === 'production' && [
      'babel-plugin-transform-remove-console',
      { exclude: ['error', 'warn'] }
    ]
  ].filter(Boolean)
}