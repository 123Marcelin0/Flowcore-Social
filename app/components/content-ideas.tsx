"use client"

import { useContentIdeas } from "./content-ideas/hooks/useContentIdeas"
import { ContentIdeasOverview } from "./content-ideas/steps/ContentIdeasOverview"
import { ContentIdeasStrategies } from "./content-ideas/steps/ContentIdeasStrategies"
import { ContentIdeasBrainstorm } from "./content-ideas/steps/ContentIdeasBrainstorm"
import { ContentIdeasInspiration } from "./content-ideas/steps/ContentIdeasInspiration"
import { ContentIdeasDevelop } from "./content-ideas/steps/ContentIdeasDevelop"

export function ContentIdeas() {
  const contentIdeasState = useContentIdeas()

  // Render the appropriate step based on current state
  switch (contentIdeasState.currentStep) {
    case "overview":
      return (
        <ContentIdeasOverview
          showSuccessAnimation={contentIdeasState.showSuccessAnimation}
          setCurrentStep={contentIdeasState.setCurrentStep}
          triggerSuccessAnimation={contentIdeasState.triggerSuccessAnimation}
        />
      )

    case "strategies":
      return (
        <ContentIdeasStrategies
          setCurrentStep={contentIdeasState.setCurrentStep}
        />
      )

    case "brainstorm":
      return (
        <ContentIdeasBrainstorm
          setCurrentStep={contentIdeasState.setCurrentStep}
        />
      )

    case "inspiration":
      return (
        <ContentIdeasInspiration
          setCurrentStep={contentIdeasState.setCurrentStep}
        />
      )

    case "develop":
      return (
        <ContentIdeasDevelop
          setCurrentStep={contentIdeasState.setCurrentStep}
        />
      )

    default:
      return (
        <ContentIdeasOverview
          showSuccessAnimation={contentIdeasState.showSuccessAnimation}
          setCurrentStep={contentIdeasState.setCurrentStep}
          triggerSuccessAnimation={contentIdeasState.triggerSuccessAnimation}
        />
      )
  }
}
     
     