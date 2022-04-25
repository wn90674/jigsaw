import { defineBuildConfig } from 'unbuild'
import css from 'rollup-plugin-import-css'
export default defineBuildConfig({
  entries: [
    'src/index',
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  hooks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    'rollup:options': (ctx, opt) => {
      // opt.plugins?.push(css())
    },
  },
})
