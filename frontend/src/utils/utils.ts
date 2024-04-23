export async function loaderFn<T>(fn: () => Promise<T>) {
    const result = await fn()
    return result
}

// tanstack.com utility functions
export const seo = ({
    title,
    description,
    keywords,
  }: {
    title: string
    description?: string
    keywords?: string
  }) => {
    const tags = [
      { title },
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },
    ]
  
    return tags
  }