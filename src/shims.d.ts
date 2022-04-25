
declare module '*.css' {
  const content: any
  export default content
}

declare interface Window {
  jigsaw: {
    init: (opts: any) => void
  }
}
