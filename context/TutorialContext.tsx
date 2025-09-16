"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { TutorialData } from "@/components/tutorial-modal"
import { getWelcomeTutorial, getTutorialForPage } from "@/lib/tutorial-content"
import { createClient } from "@/lib/supabase/client"

interface TutorialPreferences {
  show_tutorials: boolean
  completed_tutorials: string[]
  dont_show_again: string[]
}

interface TutorialContextType {
  // Modal state
  isModalOpen: boolean
  currentTutorial: TutorialData | null
  
  // User preferences
  hasSeenWelcome: boolean
  tutorialPreferences: TutorialPreferences
  
  // Actions
  openTutorial: (page: string) => void
  openWelcomeTutorial: () => void
  closeTutorial: () => void
  setDontShowAgain: (page: string) => void
  markTutorialComplete: (page: string) => void
  
  // Loading state
  isLoading: boolean
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

interface TutorialProviderProps {
  children: ReactNode
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTutorial, setCurrentTutorial] = useState<TutorialData | null>(null)
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true) // Default to true until we load from DB
  const [tutorialPreferences, setTutorialPreferences] = useState<TutorialPreferences>({
    show_tutorials: true,
    completed_tutorials: [],
    dont_show_again: []
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  // Load user tutorial preferences from database
  useEffect(() => {
    loadTutorialPreferences()
  }, [])

  const loadTutorialPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      // Try to get user tutorial preferences from the users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('tutorial_preferences, has_seen_welcome')
        .eq('id', user.id)
        .single()

      if (error) {
        console.warn('Failed to load tutorial preferences:', error)
        // If user doesn't exist in users table or error, show welcome by default
        setHasSeenWelcome(false)
        setIsLoading(false)
        return
      }

      const preferences = userData?.tutorial_preferences || {}
      const seenWelcome = userData?.has_seen_welcome || false

      setTutorialPreferences(preferences)
      setHasSeenWelcome(seenWelcome)
      
      // Show welcome tutorial for new users
      if (!seenWelcome) {
        setTimeout(() => {
          openWelcomeTutorial()
        }, 1000) // Small delay to let the app render
      }
    } catch (error) {
      console.error('Error loading tutorial preferences:', error)
      setHasSeenWelcome(false) // Show welcome on error
    } finally {
      setIsLoading(false)
    }
  }

  const saveTutorialPreferences = async (preferences: TutorialPreferences, seenWelcome?: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updateData: any = {
        tutorial_preferences: preferences
      }

      if (seenWelcome !== undefined) {
        updateData.has_seen_welcome = seenWelcome
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.warn('Failed to save tutorial preferences:', error)
      }
    } catch (error) {
      console.error('Error saving tutorial preferences:', error)
    }
  }

  const openTutorial = (page: string) => {
    const tutorial = getTutorialForPage(page)
    if (tutorial) {
      setCurrentTutorial(tutorial)
      setIsModalOpen(true)
    }
  }

  const openWelcomeTutorial = () => {
    const welcomeTutorial = getWelcomeTutorial()
    setCurrentTutorial(welcomeTutorial)
    setIsModalOpen(true)
  }

  const closeTutorial = () => {
    setIsModalOpen(false)
    setCurrentTutorial(null)
  }

  const setDontShowAgain = (page: string) => {
    const newPreferences = {
      ...tutorialPreferences,
      [page]: false // false means don't show again
    }
    
    setTutorialPreferences(newPreferences)
    
    // If this is the welcome tutorial, also mark as seen
    if (page === 'welcome') {
      setHasSeenWelcome(true)
      saveTutorialPreferences(newPreferences, true)
    } else {
      saveTutorialPreferences(newPreferences)
    }
    
    closeTutorial()
  }

  const markTutorialComplete = (page: string) => {
    const newPreferences = {
      ...tutorialPreferences,
      [page]: true // true means completed/seen
    }
    
    setTutorialPreferences(newPreferences)
    
    // If this is the welcome tutorial, mark as seen
    if (page === 'welcome') {
      setHasSeenWelcome(true)
      saveTutorialPreferences(newPreferences, true)
    } else {
      saveTutorialPreferences(newPreferences)
    }
  }

  // Check if a tutorial should be shown for a page
  const shouldShowTutorial = (page: string): boolean => {
    if (page === 'welcome') {
      return !hasSeenWelcome
    }
    // Check if the page is in the "don't show again" list
    return !tutorialPreferences.dont_show_again.includes(page)
  }

  const value: TutorialContextType = {
    isModalOpen,
    currentTutorial,
    hasSeenWelcome,
    tutorialPreferences,
    openTutorial,
    openWelcomeTutorial,
    closeTutorial,
    setDontShowAgain,
    markTutorialComplete,
    isLoading
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  )
}

export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext)
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider')
  }
  return context
}

// Hook to automatically trigger page-specific tutorials
export const usePageTutorial = (page: string, enabled: boolean = true) => {
  const { openTutorial, tutorialPreferences, isLoading } = useTutorial()

  useEffect(() => {
    if (!enabled || isLoading) return

    // Check if tutorial should be shown for this page
    const shouldShow = !tutorialPreferences.dont_show_again.includes(page)
    
    // Auto-trigger tutorial for new users (optional)
    // You can customize this logic based on your needs
    if (shouldShow && !tutorialPreferences.completed_tutorials.includes(page)) {
      // Uncomment the next line if you want auto-tutorials on first visit
      // setTimeout(() => openTutorial(page), 2000)
    }
  }, [page, enabled, isLoading, tutorialPreferences, openTutorial])

  return {
    openTutorial: () => openTutorial(page)
  }
}