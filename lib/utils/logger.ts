/**
 * Development logging utility
 * Automatically disabled in production builds
 */

interface Logger {
  log: (...args: any[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger: Logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always show errors, even in production
    console.error(...args);
  }
};

// Optional: Create performance measurement utility
export const performance = {
  mark: (label: string) => {
    if (isDevelopment && typeof window !== 'undefined' && window.performance) {
      window.performance.mark(label);
    }
  },
  measure: (name: string, startMark: string, endMark?: string) => {
    if (isDevelopment && typeof window !== 'undefined' && window.performance) {
      window.performance.measure(name, startMark, endMark);
      const measurement = window.performance.getEntriesByName(name)[0];
      logger.log(`⚡ ${name}: ${measurement.duration.toFixed(2)}ms`);
    }
  }
};

export default logger;