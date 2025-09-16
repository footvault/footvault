// Tutorial System Test Component
// Use this to manually test the tutorial system functionality

"use client"

import { useTutorial } from "@/context/TutorialContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TutorialSystemTest() {
  const { 
    openTutorial, 
    openWelcomeTutorial,
    isModalOpen, 
    currentTutorial,
    hasSeenWelcome,
    tutorialPreferences 
  } = useTutorial()

  const testPages = [
    'welcome',
    'inventory', 
    'variants', 
    'add-product', 
    'checkout',
    'sales', 
    'customers', 
    'pre-orders', 
    'consignors', 
    'settings'
  ]

  return (
    <Card className="w-full max-w-2xl mx-auto m-4">
      <CardHeader>
        <CardTitle>Tutorial System Test Panel</CardTitle>
        <CardDescription>
          Test the tutorial functionality - click buttons to open different tutorials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current State:</h3>
          <p className="text-sm">Modal Open: {isModalOpen ? 'Yes' : 'No'}</p>
          <p className="text-sm">Current Tutorial: {currentTutorial?.page || 'None'}</p>
          <p className="text-sm">Has Seen Welcome: {hasSeenWelcome ? 'Yes' : 'No'}</p>
          <p className="text-sm">Show Tutorials: {tutorialPreferences.show_tutorials ? 'Yes' : 'No'}</p>
          <p className="text-sm">Completed: {tutorialPreferences.completed_tutorials?.join(', ') || 'None'}</p>
          <p className="text-sm">Don't Show Again: {tutorialPreferences.dont_show_again?.join(', ') || 'None'}</p>
        </div>

        {/* Test Buttons */}
        <div className="space-y-2">
          <h3 className="font-semibold">Test Tutorial Opening:</h3>
          <div className="grid grid-cols-2 gap-2">
            {testPages.map((page) => (
              <Button
                key={page}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (page === 'welcome') {
                    openWelcomeTutorial()
                  } else {
                    openTutorial(page)
                  }
                }}
                className="capitalize"
              >
                {page.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Testing Instructions:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Click any tutorial button to open that tutorial</li>
            <li>Navigate through tutorial steps using Previous/Next</li>
            <li>Test the "Don't show again" functionality</li>
            <li>Test the close (X) button</li>
            <li>Check that preferences are saved in the database</li>
            <li>Test the help button in the sidebar (when available)</li>
          </ol>
        </div>

        {/* Database Test */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold mb-2">Database Integration:</h3>
          <p className="text-sm">
            Tutorial preferences are automatically saved to the users table. 
            Check your Supabase dashboard to verify the has_seen_welcome and 
            tutorial_preferences columns are being updated.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Instructions for adding this to a page:
// 1. Import: import { TutorialSystemTest } from "@/components/tutorial-system-test"
// 2. Add to any page: <TutorialSystemTest />
// 3. Wrap the page with TutorialProvider if not already wrapped