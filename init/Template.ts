export interface Template<T = never> {
  message: string
  getExampleUrl: ({ componentFolder }: { componentFolder: string }) => string
  recommendedComponentFolder: string
  test(rootPath: string): { success: boolean; payload?: T }
  getPluginsCode: (payload?: T) => string
}
