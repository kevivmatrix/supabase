import { useChat } from 'ai/react'
import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AiIconAnimation,
  Button,
  IconAlertTriangle,
  IconCornerDownLeft,
  IconUser,
  Input,
  markdownComponents,
} from 'ui'
import { v4 as uuidv4 } from 'uuid'

import { last } from 'lodash'
import { cn } from './../../lib/utils'
import { AiWarning } from './Command.alerts'
import { AiIconChat } from './Command.icons'
import { CommandGroup, CommandItem, useAutoInputFocus, useHistoryKeys } from './Command.utils'
import { useCommandMenu } from './CommandMenuProvider'

const questions = [
  'How do I get started with Supabase?',
  'How do I run Supabase locally?',
  'How do I connect to my database?',
  'How do I run migrations? ',
  'How do I listen to changes in a table?',
  'How do I set up authentication?',
]

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

export enum MessageStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Complete = 'complete',
}

export interface Message {
  role: MessageRole
  content: string
  status: MessageStatus
}

const AiCommand = () => {
  const { isLoading, setIsLoading, search, setSearch, site } = useCommandMenu()
  const [chatId, setChatId] = useState(uuidv4())

  let basePath = ''
  if (site === 'studio') {
    basePath = '/dashboard'
  }
  if (site === 'docs') {
    basePath = '/docs'
  }

  const {
    messages,
    append,
    isLoading: isResponding,
    error,
  } = useChat({
    id: `${chatId}`,
    api: `${basePath}/api/ai/docs`,
  })
  const submit = (query: string) => {
    setIsLoading(true)

    append({
      content: query,
      role: 'user',
      createdAt: new Date(),
    })
  }

  const inputRef = useAutoInputFocus()

  useHistoryKeys({
    enable: !isResponding,
    messages: messages
      .filter(({ role }) => role === MessageRole.User)
      .map(({ content }) => content),
    setPrompt: setSearch,
  })

  const handleSubmit = useCallback(
    (message: string) => {
      setSearch('')
      submit(message)
    },
    [submit]
  )

  const handleReset = useCallback(() => {
    setSearch('')
    // reset the id of the chat so that all messages are discarded
    setChatId(uuidv4())
  }, [])

  useEffect(() => {
    if (search) {
      handleSubmit(search)
    }
  }, [])

  useEffect(() => {
    if (isLoading !== isResponding) {
      setIsLoading(isResponding)
    }
  }, [isLoading, isResponding])

  // Detect an IME composition (so that we can ignore Enter keypress)
  const [isImeComposing, setIsImeComposing] = useState(false)

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className={cn('relative mb-[145px] py-4 max-h-[720px]')}>
        {!error ? (
          <>
            {messages.map((message, index) => {
              switch (message.role) {
                case MessageRole.User:
                  return (
                    <div key={index} className="flex gap-6 mx-4 [overflow-anchor:none] mb-6">
                      <div
                        className="
                  w-7 h-7 bg-background rounded-full border border-muted flex items-center justify-center text-foreground-lighter first-letter:
                  ring-background
                  ring-1
                  shadow-sm
              "
                      >
                        <IconUser strokeWidth={1.5} size={16} />
                      </div>
                      <div className="prose text-foreground-lighter">{message.content}</div>
                    </div>
                  )
                case MessageRole.Assistant:
                  return (
                    <div key={index} className="px-4 [overflow-anchor:none] mb-[150px]">
                      <div className="flex gap-6 [overflow-anchor:none] mb-6">
                        <AiIconChat loading={isLoading} />
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                          linkTarget="_blank"
                          className="prose dark:prose-dark"
                          transformLinkUri={(href) => {
                            const supabaseUrl = new URL('https://supabase.com')
                            const linkUrl = new URL(href, 'https://supabase.com')

                            if (linkUrl.origin === supabaseUrl.origin) {
                              return linkUrl.toString()
                            }

                            return href
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )
              }
            })}
            {isResponding && last(messages)?.role !== 'assistant' && (
              <div key={'loading'} className="px-4 [overflow-anchor:none] mb-[150px]">
                <div className="flex gap-6 [overflow-anchor:none] mb-6">
                  <AiIconChat loading={isLoading} />
                  <div className="bg-border-strong h-[21px] w-[13px] mt-1 animate-pulse animate-bounce" />
                </div>
              </div>
            )}
          </>
        ) : null}

        {messages.length === 0 && !error && (
          <CommandGroup heading="Examples">
            {questions.map((question) => {
              const key = question.replace(/\s+/g, '_')
              return (
                <CommandItem
                  type="command"
                  onSelect={() => {
                    if (!search) {
                      handleSubmit(question)
                    }
                  }}
                  key={key}
                >
                  <AiIconAnimation />
                  {question}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
        {error && (
          <div className="p-6 flex flex-col items-center gap-6 mt-4">
            <IconAlertTriangle className="text-amber-900" strokeWidth={1.5} size={21} />
            <p className="text-lg text-foreground text-center">
              Sorry, looks like Clippy is having a hard time!
            </p>
            <p className="text-sm text-foreground-muted text-center">Please try again in a bit.</p>
            <Button size="tiny" type="secondary" onClick={handleReset}>
              Try again?
            </Button>
          </div>
        )}

        <div className="[overflow-anchor:auto] h-px w-full"></div>
      </div>
      <div className="absolute bottom-0 w-full bg-background py-3">
        {messages.length > 0 && !error && <AiWarning className="mb-3 mx-3" />}
        <Input
          className="bg-alternative rounded mx-3 [&_input]:pr-32 md:[&_input]:pr-40"
          inputRef={inputRef}
          autoFocus
          placeholder={
            isLoading || isResponding ? 'Waiting on an answer...' : 'Ask Supabase AI a question...'
          }
          value={search}
          actions={
            <>
              {!isLoading && !isResponding ? (
                <div
                  className={`flex items-center gap-3 mr-3 transition-opacity duration-700 ${
                    search ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className="text-foreground-light">Submit message</span>
                  <div className="hidden text-foreground-light md:flex items-center justify-center h-6 w-6 rounded bg-overlay-hover">
                    <IconCornerDownLeft size={12} strokeWidth={1.5} />
                  </div>
                </div>
              ) : null}
            </>
          }
          onChange={(e) => {
            if (!isLoading || !isResponding) {
              setSearch(e.target.value)
            }
          }}
          onCompositionStart={() => setIsImeComposing(true)}
          onCompositionEnd={() => setIsImeComposing(false)}
          onKeyDown={(e) => {
            switch (e.key) {
              case 'Enter':
                if (!search || isLoading || isResponding || isImeComposing) {
                  return
                }
                return handleSubmit(search)
              default:
                return
            }
          }}
        />
      </div>
    </div>
  )
}

export default AiCommand
