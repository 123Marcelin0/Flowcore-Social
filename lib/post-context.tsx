"use client"

import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { PostsService } from '@/lib/data-service'
import { useAuth } from '@/lib/auth-context'
import type { Post as DatabasePost } from '@/lib/supabase'
import { toast } from 'sonner'

interface Post {
  id: string
  title: string
  content: string
  platforms: string[]
  image: string
  scheduledDate: string
  scheduledTime: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  likes: number
  comments: number
  shares: number
  createdAt: string
  updatedAt: string
  approved?: boolean
  category?: 'trend-reels' | 'content-strategies' | 'ai-strategies'
  source?: 'ai-generated' | 'trend-explorer' | 'manual' | 'content-strategy'
  tags?: string[]
  isOptimistic?: boolean
}

interface PostState {
  posts: Record<string, Post>
  drafts: Post[]
  scheduled: Post[]
  published: Post[]
  loading: boolean
  error: string | null
  draggedPostId: string | null
  dragOverDate: string | null
  lastUpdated: number
  syncStatus: 'idle' | 'syncing' | 'error'
}

type PostAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_POSTS'; payload: Post[] }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'UPDATE_POST'; payload: { id: string; updates: Partial<Post> } }
  | { type: 'DELETE_POST'; payload: string }
  | { type: 'SET_DRAG_STATE'; payload: { draggedPostId: string | null; dragOverDate: string | null } }
  | { type: 'OPTIMISTIC_UPDATE'; payload: { id: string; updates: Partial<Post> } }
  | { type: 'REVERT_OPTIMISTIC'; payload: string }
  | { type: 'SET_SYNC_STATUS'; payload: 'idle' | 'syncing' | 'error' }
  | { type: 'BATCH_UPDATE'; payload: { posts: Post[]; source: string } }

const initialState: PostState = {
  posts: {},
  drafts: [],
  scheduled: [],
  published: [],
  loading: false,
  error: null,
  draggedPostId: null,
  dragOverDate: null,
  lastUpdated: 0,
  syncStatus: 'idle'
}

// Convert database Post to component format
const convertDatabasePost = (dbPost: DatabasePost): Post => {
  const dateTime = dbPost.status === 'published' && dbPost.published_at 
    ? new Date(dbPost.published_at) 
    : dbPost.scheduled_at 
    ? new Date(dbPost.scheduled_at) 
    : new Date()

  // Helper function to check if a scheduled post is in the past
  const isScheduledInPast = (status: string, scheduledAt: string | null): boolean => {
    if (status !== 'scheduled' || !scheduledAt) return false;
    const scheduledDate = new Date(scheduledAt);
    return scheduledDate < new Date();
  }

  // Determine the correct status (convert past scheduled posts to drafts)
  const correctStatus = isScheduledInPast(dbPost.status, dbPost.scheduled_at) 
    ? 'draft' 
    : dbPost.status as 'draft' | 'scheduled' | 'published' | 'failed';

  return {
    id: dbPost.id,
    title: dbPost.title || 'Untitled Post',
    content: dbPost.content,
    platforms: dbPost.platforms || [],
    image: (dbPost.media_urls && dbPost.media_urls[0]) || '/placeholder.svg',
    scheduledDate: dateTime.toISOString().split('T')[0],
    scheduledTime: dateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    status: correctStatus,
    likes: dbPost.likes || 0,
    comments: dbPost.comments_count || 0,
    shares: dbPost.shares || 0,
    createdAt: new Date(dbPost.created_at).toLocaleDateString(),
    updatedAt: new Date(dbPost.updated_at).toLocaleDateString()
  }
}

// Categorize posts by status
const categorizePosts = (posts: Record<string, Post>) => {
  const drafts: Post[] = []
  const scheduled: Post[] = []
  const published: Post[] = []

  Object.values(posts).forEach(post => {
    switch (post.status) {
      case 'draft':
        drafts.push(post)
        break
      case 'scheduled':
        scheduled.push(post)
        break
      case 'published':
        published.push(post)
        break
    }
  })

  return { drafts, scheduled, published }
}

function postReducer(state: PostState, action: PostAction): PostState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload }
    
    case 'SET_POSTS': {
      const postsMap = action.payload.reduce((acc, post) => {
        acc[post.id] = post
        return acc
      }, {} as Record<string, Post>)
      
      const categorized = categorizePosts(postsMap)
      return { 
        ...state, 
        posts: postsMap,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    case 'BATCH_UPDATE': {
      // Handle batch updates from sync operations
      const newPosts = { ...state.posts }
      action.payload.posts.forEach(post => {
        newPosts[post.id] = post
      })
      
      const categorized = categorizePosts(newPosts)
      return { 
        ...state, 
        posts: newPosts,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    case 'ADD_POST': {
      const newPosts = { ...state.posts, [action.payload.id]: action.payload }
      const categorized = categorizePosts(newPosts)
      return { 
        ...state, 
        posts: newPosts,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    case 'UPDATE_POST': {
      const { id, updates } = action.payload
      const currentPost = state.posts[id]
      if (!currentPost) return state
      
      const updatedPost = { ...currentPost, ...updates }
      const newPosts = { ...state.posts, [id]: updatedPost }
      const categorized = categorizePosts(newPosts)
      
      return { 
        ...state, 
        posts: newPosts,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    case 'DELETE_POST': {
      const { [action.payload]: deleted, ...remainingPosts } = state.posts
      const categorized = categorizePosts(remainingPosts)
      return { 
        ...state, 
        posts: remainingPosts,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    case 'SET_DRAG_STATE':
      return { 
        ...state, 
        draggedPostId: action.payload.draggedPostId,
        dragOverDate: action.payload.dragOverDate
      }
    
    case 'OPTIMISTIC_UPDATE': {
      const { id, updates } = action.payload
      const currentPost = state.posts[id]
      if (!currentPost) return state
      
      const updatedPost = { ...currentPost, ...updates, isOptimistic: true }
      const newPosts = { ...state.posts, [id]: updatedPost }
      const categorized = categorizePosts(newPosts)
      
      return { 
        ...state, 
        posts: newPosts,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    case 'REVERT_OPTIMISTIC': {
      const currentPost = state.posts[action.payload]
      if (!currentPost || !currentPost.isOptimistic) return state
      
      const { [action.payload]: deleted, ...remainingPosts } = state.posts
      const categorized = categorizePosts(remainingPosts)
      
      return { 
        ...state, 
        posts: remainingPosts,
        ...categorized,
        lastUpdated: Date.now()
      }
    }
    
    default:
      return state
  }
}

interface PostContextType {
  state: PostState
  actions: {
    fetchPosts: () => Promise<void>
    updatePost: (id: string, updates: Partial<Post>) => Promise<void>
    updatePostDate: (id: string, date: string, time: string) => Promise<void>
    deletePost: (id: string) => Promise<void>
    addPost: (post: Omit<Post, 'id'>) => Promise<void>
    setDragState: (draggedPostId: string | null, dragOverDate: string | null) => void
    optimisticUpdatePost: (id: string, updates: Partial<Post>) => void
    getPostsForDate: (date: Date) => Post[]
    getPostById: (id: string) => Post | undefined
    syncPosts: (source?: string) => Promise<void>
    subscribeToChanges: (callback: (event: PostSyncEvent) => void) => () => void
  }
}

// Event system for real-time synchronization
interface PostSyncEvent {
  type: 'post_created' | 'post_updated' | 'post_deleted' | 'batch_sync'
  postId?: string
  post?: Post
  posts?: Post[]
  source?: string
  timestamp: number
}

const PostContext = createContext<PostContextType | undefined>(undefined)

export function PostProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(postReducer, initialState)
  const optimisticTimeouts = useRef<Record<string, NodeJS.Timeout>>({})
  const syncQueue = useRef<Set<string>>(new Set())
  const isOnline = useRef(true)
  const syncEventListeners = useRef<Set<(event: PostSyncEvent) => void>>(new Set())
  const lastFetchTime = useRef<number>(0)
  const syncInterval = useRef<NodeJS.Timeout | null>(null)

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => { 
      isOnline.current = true
      // Trigger sync when coming back online
      if (syncQueue.current.size > 0) {
        syncPosts('network_reconnect')
      }
    }
    const handleOffline = () => { isOnline.current = false }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Periodic sync for real-time updates
  useEffect(() => {
    if (user && isOnline.current) {
      console.log('Setting up periodic sync')
      syncInterval.current = setInterval(() => {
        if (user && isOnline.current) {
          syncPosts('periodic')
        }
      }, 30000) // Sync every 30 seconds
      
      return () => {
        if (syncInterval.current) {
          console.log('Clearing periodic sync interval')
          clearInterval(syncInterval.current)
        }
      }
    } else {
      console.log('User not authenticated or offline, skipping periodic sync')
    }
  }, [user])

  // Broadcast sync events
  const broadcastSyncEvent = useCallback((event: PostSyncEvent) => {
    syncEventListeners.current.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in sync event listener:', error)
      }
    })
  }, [])

  // Subscribe to sync events
  const subscribeToChanges = useCallback((callback: (event: PostSyncEvent) => void) => {
    syncEventListeners.current.add(callback)
    return () => {
      syncEventListeners.current.delete(callback)
    }
  }, [])

  // Smart sync with minimal network calls
  const syncPosts = useCallback(async (source: string = 'manual') => {
    if (!user || !isOnline.current) {
      console.log('No user or offline, skipping sync')
      return
    }
    
    // Prevent too frequent syncs
    const now = Date.now()
    if (now - lastFetchTime.current < 5000 && source === 'periodic') {
      return
    }
    lastFetchTime.current = now
    
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' })
    
    try {
      const dbPosts = await PostsService.getPosts({ limit: 1000, includeMedia: true })
      const posts = dbPosts.map(convertDatabasePost)
      
      // Check if there are actual changes
      const hasChanges = posts.some(post => {
        const existing = state.posts[post.id]
        return !existing || existing.updatedAt !== post.updatedAt
      })
      
      if (hasChanges || Object.keys(state.posts).length !== posts.length) {
        dispatch({ type: 'BATCH_UPDATE', payload: { posts, source } })
        
        // Broadcast sync event
        broadcastSyncEvent({
          type: 'batch_sync',
          posts,
          source,
          timestamp: now
        })
        console.log(`Synced ${posts.length} posts from ${source}`)
      }
      
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync posts'
      
      // Handle authentication errors gracefully
      if (errorMessage.includes('JWT') || errorMessage.includes('invalid token') || errorMessage.includes('auth')) {
        console.log('Authentication error in syncPosts, clearing posts')
        dispatch({ type: 'SET_POSTS', payload: [] })
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' })
      } else {
        console.log('Error syncing posts:', error)
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' })
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
      }
    }
  }, [user, state.posts, broadcastSyncEvent])

  // Fetch posts from server
  const fetchPosts = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping fetch posts')
      return
    }
    
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      const dbPosts = await PostsService.getPosts({ limit: 1000, includeMedia: true })
      const posts = dbPosts.map(convertDatabasePost)
      dispatch({ type: 'SET_POSTS', payload: posts })
      lastFetchTime.current = Date.now()
      console.log(`Successfully fetched ${posts.length} posts`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch posts'
      
      // Don't show error for authentication issues
      if (errorMessage.includes('JWT') || errorMessage.includes('invalid token') || errorMessage.includes('auth')) {
        console.log('Authentication error in fetchPosts, clearing posts')
        dispatch({ type: 'SET_POSTS', payload: [] })
      } else {
        console.log('Error fetching posts:', error)
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [user])

  // Update post with optimistic updates and real-time sync
  const updatePost = useCallback(async (id: string, updates: Partial<Post>) => {
    if (!user) return;
    
    // Optimistic update
    dispatch({ type: 'OPTIMISTIC_UPDATE', payload: { id, updates } });
    
    try {
      // Get the current post to preserve existing data
      const currentPost = state.posts[id];
      
      // Construct the database update object
      const dbUpdateData: any = {};
      
      // Add basic fields if they exist in updates
      if (updates.title !== undefined) dbUpdateData.title = updates.title;
      if (updates.content !== undefined) dbUpdateData.content = updates.content;
      if (updates.platforms !== undefined) dbUpdateData.platforms = updates.platforms;
      if (updates.status !== undefined) dbUpdateData.status = updates.status;
      if (updates.image !== undefined) dbUpdateData.media_urls = updates.image ? [updates.image] : [];
      if (updates.likes !== undefined) dbUpdateData.likes = updates.likes;
      if (updates.comments !== undefined) dbUpdateData.comments = updates.comments;
      if (updates.shares !== undefined) dbUpdateData.shares = updates.shares;
      
      // Handle scheduled date/time - use updated values or preserve existing ones
      const scheduledDate = updates.scheduledDate || currentPost?.scheduledDate;
      const scheduledTime = updates.scheduledTime || currentPost?.scheduledTime;
      
      if (scheduledDate && scheduledTime) {
        dbUpdateData.scheduled_at = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      } else if (updates.scheduledDate === '' || updates.scheduledTime === '') {
        // If explicitly clearing the schedule
        dbUpdateData.scheduled_at = null;
      }
      
      const dbPost = await PostsService.updatePost(id, dbUpdateData);
      
      const updatedPost = convertDatabasePost(dbPost);
      dispatch({ type: 'UPDATE_POST', payload: { id, updates: updatedPost } });
      
      // Broadcast update event
      broadcastSyncEvent({
        type: 'post_updated',
        postId: id,
        post: updatedPost,
        source: 'user_action',
        timestamp: Date.now()
      });
      
      // Clear optimistic timeout
      if (optimisticTimeouts.current[id]) {
        clearTimeout(optimisticTimeouts.current[id]);
        delete optimisticTimeouts.current[id];
      }
    } catch (error) {
      console.error('Error updating post:', error);
      dispatch({ type: 'REVERT_OPTIMISTIC', payload: id });
      toast.error('Fehler beim Aktualisieren des Beitrags');
    }
  }, [user, state.posts, broadcastSyncEvent]);

  // Update post date with real-time sync
  const updatePostDate = useCallback(async (id: string, date: string, time: string) => {
    if (!user) return
    
    // Optimistic update
    dispatch({ type: 'OPTIMISTIC_UPDATE', payload: { 
      id, 
      updates: { 
        scheduledDate: date, 
        scheduledTime: time, 
        status: 'scheduled' 
      } 
    }})
    
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
      const dbPost = await PostsService.updatePost(id, {
        status: 'scheduled',
        scheduled_at: scheduledAt
      })
      
      const updatedPost = convertDatabasePost(dbPost)
      dispatch({ type: 'UPDATE_POST', payload: { id, updates: updatedPost } })
      
      // Broadcast update event
      broadcastSyncEvent({
        type: 'post_updated',
        postId: id,
        post: updatedPost,
        source: 'user_action',
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating post date:', error)
      dispatch({ type: 'REVERT_OPTIMISTIC', payload: id })
      toast.error('Fehler beim Aktualisieren des Beitragsdatums')
    }
  }, [user, broadcastSyncEvent])

  // Delete post with real-time sync
  const deletePost = useCallback(async (id: string) => {
    if (!user) return
    
    // Optimistic removal
    const postToDelete = state.posts[id]
    dispatch({ type: 'DELETE_POST', payload: id })
    
    try {
      await PostsService.deletePost(id)
      
      // Broadcast delete event
      broadcastSyncEvent({
        type: 'post_deleted',
        postId: id,
        source: 'user_action',
        timestamp: Date.now()
      })
      
      toast.success('Beitrag erfolgreich gelöscht!')
    } catch (error) {
      console.error('Error deleting post:', error)
      if (postToDelete) {
        dispatch({ type: 'ADD_POST', payload: postToDelete })
      }
      toast.error('Fehler beim Löschen des Beitrags')
    }
  }, [user, state.posts, broadcastSyncEvent])

  // Add new post with real-time sync and duplicate prevention
  const addPost = useCallback(async (post: Omit<Post, 'id'>) => {
    if (!user) return
    
    // Check for potential duplicates (same content and platforms within last 5 minutes)
    const now = Date.now()
    const duplicateThreshold = 5 * 60 * 1000 // 5 minutes
    
    const potentialDuplicate = Object.values(state.posts).find(existingPost => 
      existingPost.content === post.content &&
      JSON.stringify(existingPost.platforms.sort()) === JSON.stringify(post.platforms.sort()) &&
      (now - new Date(existingPost.createdAt).getTime()) < duplicateThreshold
    )
    
    if (potentialDuplicate) {
      toast.error('Ein ähnlicher Beitrag wurde kürzlich erstellt. Bitte prüfen Sie Ihre Posts.')
      return
    }
    
    const tempId = `temp-${Date.now()}`
    const tempPost: Post = {
      ...post,
      id: tempId,
      isOptimistic: true
    }
    
    // Add to UI immediately
    dispatch({ type: 'ADD_POST', payload: tempPost })
    
    try {
      const postDateTime = post.scheduledDate && post.scheduledTime ? 
        new Date(`${post.scheduledDate}T${post.scheduledTime}:00`).toISOString() : null
      
      const dbPost = await PostsService.createPost({
        user_id: user.id,
        title: post.title,
        content: post.content,
        media_urls: post.image ? [post.image] : [],
        media_type: post.image ? 'image' : 'text',
        platforms: post.platforms,
        status: post.status,
        scheduled_at: post.status === 'scheduled' ? postDateTime : null,
        published_at: post.status === 'published' ? postDateTime : null,
        likes: post.likes || 0,
        comments_count: post.comments || 0,
        shares: post.shares || 0
      })
      
      // Replace temp post with real post
      dispatch({ type: 'DELETE_POST', payload: tempId })
      const realPost = convertDatabasePost(dbPost)
      dispatch({ type: 'ADD_POST', payload: realPost })
      
      // Broadcast create event
      broadcastSyncEvent({
        type: 'post_created',
        postId: realPost.id,
        post: realPost,
        source: 'user_action',
        timestamp: Date.now()
      })
      
      console.log('Post erfolgreich erstellt:', realPost.title)
    } catch (error) {
      console.error('Error creating post:', error)
      dispatch({ type: 'DELETE_POST', payload: tempId })
      
      // Provide user-friendly error messages
      let errorMessage = 'Beitrag konnte nicht erstellt werden. Bitte versuchen Sie es erneut.'
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          errorMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
        } else if (error.message.includes('Database schema error')) {
          errorMessage = 'Es gab einen Datenbankfehler. Bitte versuchen Sie es erneut.'
        } else if (error.message.includes('session has expired')) {
          errorMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
        } else if (error.message.includes('JWT')) {
          errorMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
        } else {
          errorMessage = error.message
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      toast.error(errorMessage)
    }
  }, [user, state.posts, broadcastSyncEvent])

  // Drag state management
  const setDragState = useCallback((draggedPostId: string | null, dragOverDate: string | null) => {
    dispatch({ type: 'SET_DRAG_STATE', payload: { draggedPostId, dragOverDate } })
  }, [])

  // Optimistic update (for immediate UI feedback)
  const optimisticUpdatePost = useCallback((id: string, updates: Partial<Post>) => {
    dispatch({ type: 'OPTIMISTIC_UPDATE', payload: { id, updates } })
  }, [])

  // Get posts for a specific date (including drafts with scheduled dates)
  const getPostsForDate = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    
    // Include drafts with scheduled dates
    const draftsWithDates = state.drafts.filter(draft => 
      draft.scheduledDate && draft.scheduledTime &&
      draft.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
      draft.scheduledTime.match(/^\d{2}:\d{2}$/)
    )
    
    return [...state.scheduled, ...state.published, ...draftsWithDates].filter(post => {
      return post.scheduledDate === dateString &&
             post.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
             post.scheduledTime.match(/^\d{2}:\d{2}$/)
    }).sort((a, b) => {
      // Sort by time, then by status (published first, then scheduled, then drafts)
      if (a.status !== b.status) {
        const statusOrder = { 'published': 0, 'scheduled': 1, 'draft': 2, 'failed': 3 }
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return a.scheduledTime.localeCompare(b.scheduledTime)
    })
  }, [state.scheduled, state.published, state.drafts])

  // Get post by ID
  const getPostById = useCallback((id: string) => {
    return state.posts[id]
  }, [state.posts])

  // Load initial data
  useEffect(() => {
    if (user && isOnline.current) {
      console.log('User authenticated, fetching posts')
      fetchPosts()
    } else if (!user) {
      console.log('User not authenticated, clearing posts')
      dispatch({ type: 'SET_POSTS', payload: [] })
      dispatch({ type: 'SET_ERROR', payload: null })
    }
  }, [user, fetchPosts])

  // Sync offline changes when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (syncQueue.current.size > 0) {
        toast.info('Syncing offline changes...')
        
        for (const postId of syncQueue.current) {
          try {
            const post = state.posts[postId]
            if (post && post.isOptimistic) {
              await updatePost(postId, {})
            }
          } catch (error) {
            console.error('Error syncing post:', error)
          }
        }
        
        syncQueue.current.clear()
        toast.success('All changes synced successfully!')
      }
    }
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [state.posts, updatePost])

  const actions = {
    fetchPosts,
    updatePost,
    updatePostDate,
    deletePost,
    addPost,
    setDragState,
    optimisticUpdatePost,
    getPostsForDate,
    getPostById,
    syncPosts,
    subscribeToChanges
  }

  return (
    <PostContext.Provider value={{ state, actions }}>
      {children}
    </PostContext.Provider>
  )
}

export function usePost() {
  const context = useContext(PostContext)
  if (!context) {
    throw new Error('usePost must be used within a PostProvider')
  }
  return context
} 