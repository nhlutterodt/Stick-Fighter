import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/bootstrap.js',
  output: {
    dir: 'dist', // Use output.dir for code-splitting
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    terser()
  ],
  preserveEntrySignatures: false
};
