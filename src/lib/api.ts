import type {
  CategoriesDocument,
  ProcessDocument
} from '@/types'

const JSON_HEADERS = {
  'Content-Type': 'application/json'
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }
  if (res.status === 204) {
    return {} as T
  }
  return (await res.json()) as T
}

export async function fetchCategories() {
  const res = await fetch('/api/categories')
  return handleResponse<CategoriesDocument>(res)
}

export async function persistCategories(payload: CategoriesDocument) {
  const res = await fetch('/api/categories', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  })
  return handleResponse<CategoriesDocument>(res)
}

export async function fetchProcess(categoryId: string, processId: string) {
  const res = await fetch(`/api/process/${categoryId}/${processId}`)
  return handleResponse<ProcessDocument>(res)
}

export async function persistProcess(doc: ProcessDocument) {
  const { categoryId, processId } = doc.meta
  const res = await fetch(`/api/process/${categoryId}/${processId}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(doc)
  })
  return handleResponse<ProcessDocument>(res)
}

export async function resetProcess(categoryId: string, processId: string) {
  const res = await fetch(`/api/process/${categoryId}/${processId}/reset`, {
    method: 'POST'
  })
  return handleResponse<ProcessDocument>(res)
}

export async function createProcess(payload: {
  categoryId: string
  categoryName: string
  processId: string
  processName: string
}) {
  const res = await fetch('/api/process', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  })
  return handleResponse<ProcessDocument>(res)
}

export async function deleteProcess(categoryId: string, processId: string) {
  const res = await fetch(`/api/process/${categoryId}/${processId}`, {
    method: 'DELETE'
  })
  return handleResponse(res)
}

