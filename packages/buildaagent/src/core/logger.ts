/**
 * Logger - Simple logging utility with different levels
 * 
 * Provides structured logging for the BuildAAgent runtime
 * Can be configured for different log levels and output formats
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  private level: LogLevel

  constructor(level: LogLevel = 'info') {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.level)
    const messageLevelIndex = levels.indexOf(level)
    
    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const levelUpper = level.toUpperCase().padEnd(5)
    
    let logMessage = `${timestamp} ${levelUpper} ${message}`
    
    if (meta) {
      logMessage += ` ${JSON.stringify(meta)}`
    }
    
    return logMessage
  }

  private getLogColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    }
    return colors[level] || ''
  }

  private resetColor(): string {
    return '\x1b[0m'
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, meta)
      console.log(`${this.getLogColor('debug')}${formatted}${this.resetColor()}`)
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, meta)
      console.log(`${this.getLogColor('info')}${formatted}${this.resetColor()}`)
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, meta)
      console.warn(`${this.getLogColor('warn')}${formatted}${this.resetColor()}`)
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      let meta = error
      
      // Handle Error objects
      if (error instanceof Error) {
        meta = {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
      
      const formatted = this.formatMessage('error', message, meta)
      console.error(`${this.getLogColor('error')}${formatted}${this.resetColor()}`)
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }
}