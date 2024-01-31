import { Message, useChat } from 'ai/react'
import { stripIndent } from 'common-tags'
import { useEffect, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { Button, IconCheck, IconClipboard, IconSave } from 'ui'

import { MessageRole } from '../AiCommand'
import { useCommandMenu } from '../CommandMenuProvider'
import { formatTitle } from './GenerateSQL.utils'

export interface SQLOutputActionsProps {
  answer: string
  messages: Message[]
}

const SQLOutputActions = ({ answer, messages }: SQLOutputActionsProps) => {
  const { site } = useCommandMenu()
  const [showCopied, setShowCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  let basePath = ''
  if (site === 'studio') {
    basePath = '/dashboard'
  }
  if (site === 'docs') {
    basePath = '/docs'
  }

  const { project, saveGeneratedSQL } = useCommandMenu()

  const { reload } = useChat({
    api: `${basePath}/api/ai/docs`,
    initialMessages: [
      ...messages,
      {
        id: '1234',
        role: MessageRole.User,
        content: stripIndent`
        Generate a title for the above SQL snippet following all of these rules:
        - The title is only for the last SQL snippet
        - Focus on the main purposes of this snippet
        - Use as few words as possible
        - Title should be nouns, not verbs
        - Do not include word articles (eg. a, the, for, of)
        - Do not use words like "SQL" or "snippet" or "title"
        - Do not output markdown, quotes, etc
        - Do not be too verbose
        `,
      },
    ],
  })

  const onSelectSaveSnippet = async () => {
    setIsSaving(true)

    let suggestedTitle: string
    try {
      suggestedTitle = (await reload()) || ''
    } catch (error) {
      suggestedTitle = ''
    }

    const formattedTitle = formatTitle(suggestedTitle)
    console.log(formattedTitle)
    await saveGeneratedSQL?.(answer, formattedTitle)
    setIsSaved(true)
    setIsSaving(false)
  }

  useEffect(() => {
    if (!showCopied) return
    const timer = setTimeout(() => setShowCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [showCopied])

  useEffect(() => {
    if (!isSaved) return
    const timer = setTimeout(() => setIsSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [isSaved])

  return (
    <div className="flex items-center justify-end space-x-2">
      <CopyToClipboard text={answer?.replace(/```.*/g, '').trim()}>
        <Button
          type="default"
          icon={
            showCopied ? (
              <IconCheck size="tiny" className="text-brand" strokeWidth={2} />
            ) : (
              <IconClipboard size="tiny" />
            )
          }
          onClick={() => setShowCopied(true)}
        >
          {showCopied ? 'Copied' : 'Copy SQL'}
        </Button>
      </CopyToClipboard>
      {project?.ref !== undefined && saveGeneratedSQL !== undefined && (
        <Button
          type="default"
          loading={isSaving}
          disabled={isSaving}
          icon={
            isSaved ? (
              <IconCheck size="tiny" className="text-brand" strokeWidth={2} />
            ) : (
              <IconSave size="tiny" />
            )
          }
          onClick={() => onSelectSaveSnippet()}
        >
          {isSaved ? 'Snippet saved!' : 'Save into new snippet'}
        </Button>
      )}
    </div>
  )
}

export default SQLOutputActions
