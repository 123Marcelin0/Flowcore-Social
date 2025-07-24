"use client"

import { useContentIdeas } from "./content-ideas/hooks/useContentIdeas"
import { ContentIdeasOverview } from "./content-ideas/steps/ContentIdeasOverview"
import { ContentIdeasStrategies } from "./content-ideas/steps/ContentIdeasStrategies"
import { ContentIdeasBrainstorm } from "./content-ideas/steps/ContentIdeasBrainstorm"
import { ContentIdeasInspiration } from "./content-ideas/steps/ContentIdeasInspiration"
import { ContentIdeasDevelop } from "./content-ideas/steps/ContentIdeasDevelop"
import { ContentIdeasScript } from "./content-ideas/steps/ContentIdeasScript"

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

    case "script":
      return (
        <ContentIdeasScript
          // State
          scriptTitle={contentIdeasState.scriptTitle}
          scriptDescription={contentIdeasState.scriptDescription}
          scriptContent={contentIdeasState.scriptContent}
          visualGuidance={contentIdeasState.visualGuidance}
          contentType={contentIdeasState.contentType}
          isUploadingMedia={contentIdeasState.isUploadingMedia}
          generatedHashtags={contentIdeasState.generatedHashtags}
          uploadedMedia={contentIdeasState.uploadedMedia}
          copiedItems={contentIdeasState.copiedItems}
          uploadInputRef={contentIdeasState.uploadInputRef}
          
          // Setters
          setCurrentStep={contentIdeasState.setCurrentStep}
          setScriptTitle={contentIdeasState.setScriptTitle}
          setScriptDescription={contentIdeasState.setScriptDescription}
          setScriptContent={contentIdeasState.setScriptContent}
          setVisualGuidance={contentIdeasState.setVisualGuidance}
          setContentType={contentIdeasState.setContentType}
          
          // Functions
          handleFileUpload={contentIdeasState.handleFileUpload}
          handleRemoveMedia={contentIdeasState.handleRemoveMedia}
          copyToClipboard={contentIdeasState.copyToClipboard}
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
     
     