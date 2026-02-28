"use client";

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/config/api';

interface AccessState {
  isLoading: boolean;
  hasAccess: boolean;
  userId: string | null;
  error: string | null;
}

const USER_ID_KEY = 'tutorbox_user_id';
const ACCESS_GRACE_PERIOD = 5 * 60 * 1000;
const ACCESS_CACHE_KEY = 'tutorbox_access_cache';

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

function setStoredUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_ID_KEY, userId);
}

interface CachedAccess {
  hasAccess: boolean;
  timestamp: number;
  expiresAt?: string;
}

function getCachedAccess(): CachedAccess | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(ACCESS_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedAccess(hasAccess: boolean, expiresAt?: string): void {
  if (typeof window === 'undefined') return;
  const cache: CachedAccess = {
    hasAccess,
    timestamp: Date.now(),
    expiresAt,
  };
  localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(cache));
}

function clearCachedAccess(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_CACHE_KEY);
}

export function useAccessControl() {
  const [state, setState] = useState<AccessState>({
    isLoading: true,
    hasAccess: false,
    userId: null,
    error: null,
  });

  const getOrCreateUserId = useCallback((): string => {
    let userId = getStoredUserId();
    if (!userId) {
      userId = generateUserId();
      setStoredUserId(userId);
    }
    return userId;
  }, []);

  const checkAccess = useCallback(async (userId: string): Promise<boolean> => {
    const cached = getCachedAccess();
    if (cached) {
      const isRecent = Date.now() - cached.timestamp < ACCESS_GRACE_PERIOD;
      if (isRecent) {
        if (cached.expiresAt) {
          const expiresAt = new Date(cached.expiresAt);
          if (expiresAt > new Date()) {
            return true;
          }
        }
        if (cached.hasAccess) {
          return true;
        }
      }
    }

    try {
      const response = await fetch(API_ENDPOINTS.billingCheckAccess(userId));
      if (!response.ok) {
        throw new Error('Failed to check access');
      }
      const data = await response.json();
      const hasAccess = data.has_access === true && data.is_paid === true;
      
      if (hasAccess) {
        setCachedAccess(hasAccess, data.expires_at);
      } else {
        clearCachedAccess();
      }
      
      return hasAccess;
    } catch (error) {
      console.error('Access check failed:', error);
      return false;
    }
  }, []);

  const initialize = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    const userIdParam = urlParams.get('user_id');
    
    let userId = userIdParam || getOrCreateUserId();
    
    if (userIdParam && userIdParam !== getStoredUserId()) {
      setStoredUserId(userIdParam);
      clearCachedAccess();
    }

    if (paymentSuccess) {
      clearCachedAccess();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const hasAccess = await checkAccess(userId);
    
    setState({
      isLoading: false,
      hasAccess,
      userId,
      error: null,
    });
  }, [getOrCreateUserId, checkAccess]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const refreshAccess = useCallback(async () => {
    if (!state.userId) return;
    setState(prev => ({ ...prev, isLoading: true }));
    const hasAccess = await checkAccess(state.userId);
    setState(prev => ({ ...prev, isLoading: false, hasAccess }));
  }, [state.userId, checkAccess]);

  return {
    ...state,
    refreshAccess,
    getOrCreateUserId,
  };
}
