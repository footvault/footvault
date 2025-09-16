"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, ChevronLeft, ChevronRight, HelpCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTutorial } from "@/context/TutorialContext"

export interface TutorialStep {
  id: string
  title: string
  description: string
  icon?: React.ReactNode
  image?: string
  tips?: string[] // Can represent tips, features, or any list items
  action?: {
    label: string
    onClick: () => void
  }
}

export interface TutorialData {
  page: string
  title: string
  description: string
  steps: TutorialStep[]
}

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  tutorialData: TutorialData
  isFirstTime?: boolean
  onDontShowAgain?: () => void
  onComplete?: () => void
}

export function TutorialModal({ 
  isOpen, 
  onClose, 
  tutorialData, 
  isFirstTime = false,
  onDontShowAgain,
  onComplete 
}: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  const steps = tutorialData.steps
  const totalSteps = steps.length
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setIsCompleted(false)
    }
  }, [isOpen])

  const handleNext = () => {
    if (isLastStep) {
      setIsCompleted(true)
      onComplete?.()
      setTimeout(() => {
        handleClose()
      }, 1500)
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    setIsCompleted(false)
    onClose()
  }

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const currentStepData = steps[currentStep]

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {isFirstTime ? "Welcome to FootVault!" : tutorialData.title}
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isFirstTime ? "Let's get you started with a quick tour" : tutorialData.description}
              </p>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-2 mt-3 sm:mt-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className={cn(
                  "h-1.5 sm:h-2 rounded-full transition-all duration-200",
                  index === currentStep
                    ? "w-6 sm:w-8 bg-blue-600"
                    : index < currentStep
                    ? "w-1.5 sm:w-2 bg-green-500"
                    : "w-1.5 sm:w-2 bg-gray-200"
                )}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {currentStep + 1} of {totalSteps}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
          {isCompleted ? (
            <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12">
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Tutorial Complete!</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                You're all set to start using {tutorialData.page}
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Step Badge */}
              <Badge variant="secondary" className="w-fit text-xs sm:text-sm">
                Step {currentStep + 1}: {currentStepData.title}
              </Badge>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {/* Left Column - Text Content */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {currentStepData.icon && (
                      <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                        {currentStepData.icon}
                      </div>
                    )}
                    <h2 className="text-lg sm:text-2xl font-semibold">{currentStepData.title}</h2>
                  </div>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {currentStepData.description}
                  </p>

                  {/* Features */}
                  {currentStepData.tips && currentStepData.tips.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">⭐ Features:</h4>
                      <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                        {currentStepData.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  {currentStepData.action && (
                    <Button 
                      onClick={currentStepData.action.onClick}
                      className="w-fit text-xs sm:text-sm"
                      variant="outline"
                      size="sm"
                    >
                      {currentStepData.action.label}
                    </Button>
                  )}
                </div>

                {/* Right Column - Image/Visual */}
                <div className="flex items-center justify-center mt-4 lg:mt-0">
                  {currentStepData.image ? (
                    <div className="w-full max-w-sm sm:max-w-md">
                      <img 
                        src={currentStepData.image} 
                        alt={currentStepData.title}
                        className="w-full h-auto rounded-lg border shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-sm sm:max-w-md h-48 sm:h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center">
                      <div className="text-center text-blue-600">
                        {currentStepData.icon || <HelpCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2" />}
                        <p className="text-xs sm:text-sm font-medium">Visual Guide</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isCompleted && (
          <div className="border-t p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 flex-shrink-0">
            <div className="flex items-center gap-3 order-2 sm:order-1">
              {isFirstTime && onDontShowAgain && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onDontShowAgain}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
                >
                  Don't show again
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <Button 
                onClick={handleNext}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                size="sm"
              >
                {isLastStep ? "Complete" : (
                  <>
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                  </>
                )}
                {!isLastStep && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Context-connected wrapper component
export function TutorialModalWrapper() {
  const { 
    isModalOpen, 
    currentTutorial, 
    closeTutorial, 
    markTutorialComplete,
    setDontShowAgain 
  } = useTutorial()

  if (!isModalOpen || !currentTutorial) {
    return null
  }

  const handleDontShowAgain = () => {
    if (currentTutorial) {
      setDontShowAgain(currentTutorial.page)
    }
  }

  const handleComplete = () => {
    if (currentTutorial) {
      markTutorialComplete(currentTutorial.page)
    }
  }

  return (
    <TutorialModal
      isOpen={isModalOpen}
      onClose={closeTutorial}
      tutorialData={currentTutorial}
      onDontShowAgain={handleDontShowAgain}
      onComplete={handleComplete}
    />
  )
}