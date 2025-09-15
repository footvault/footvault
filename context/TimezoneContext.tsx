"use client"
import React, { createContext, useContext } from "react";
import { format } from 'date-fns';

interface TimezoneContextProps {
  timezone: string;
  formatInTimezone: (date: Date | string, formatString: string) => string;
  formatDateInTimezone: (date: Date | string) => string;
  formatDateTimeInTimezone: (date: Date | string) => string;
  formatTimeInTimezone: (date: Date | string) => string;
  toUserTimezone: (date: Date | string) => Date;
}

const TimezoneContext = createContext<TimezoneContextProps>({
  timezone: "America/New_York",
  formatInTimezone: () => "",
  formatDateInTimezone: () => "",
  formatDateTimeInTimezone: () => "",
  formatTimeInTimezone: () => "",
  toUserTimezone: () => new Date(),
});

export function TimezoneProvider({
  children,
  timezone,
}: {
  children: React.ReactNode;
  timezone: string;
}) {
  const formatInTimezone = (date: Date | string, formatString: string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      // Convert to user timezone using Intl API
      const userDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
      return format(userDate, formatString);
    } catch (error) {
      console.error('Error formatting date in timezone:', error);
      return 'Invalid Date';
    }
  };

  const formatDateInTimezone = (date: Date | string | null | undefined): string => {
    try {
      if (!date) {
        return 'No Date';
      }
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return dateObj.toLocaleDateString('en-US', { 
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date in timezone:', error);
      return 'Invalid Date';
    }
  };

  const formatDateTimeInTimezone = (date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleString('en-US', { 
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting datetime in timezone:', error);
      return 'Invalid Date';
    }
  };

  const formatTimeInTimezone = (date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleTimeString('en-US', { 
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time in timezone:', error);
      return 'Invalid Time';
    }
  };

  const toUserTimezone = (date: Date | string): Date => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      // Convert to user timezone using Intl API
      return new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
    } catch (error) {
      console.error('Error converting to user timezone:', error);
      return new Date();
    }
  };

  return (
    <TimezoneContext.Provider 
      value={{ 
        timezone, 
        formatInTimezone, 
        formatDateInTimezone, 
        formatDateTimeInTimezone,
        formatTimeInTimezone,
        toUserTimezone 
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}

// Utility function to get comprehensive timezone list
export const getTimezoneList = () => [
  // North America
  { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
  { value: "America/Chicago", label: "Central Time (CST/CDT)" },
  { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKST/AKDT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "America/Toronto", label: "Toronto (EST/EDT)" },
  { value: "America/Vancouver", label: "Vancouver (PST/PDT)" },

  // Europe
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },

  // Asia
  { value: "Asia/Manila", label: "Manila (PHT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Asia/Kolkata", label: "Mumbai/Delhi (IST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },

  // Australia & Oceania
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },

  // South America
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "America/Bogota", label: "Bogotá (COT)" },

  // Africa
  { value: "Africa/Cairo", label: "Cairo (EET)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
];