import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: ["src/astroweather-card.ts"],
  output: {
    dir: "dist",
    format: "es",
    entryFileNames: "[name].js",
    sourcemap: false,
  },
  context: "this",
  plugins: [
    resolve(),
    commonjs(), 
    typescript(),
  ],
  external: [],
};
