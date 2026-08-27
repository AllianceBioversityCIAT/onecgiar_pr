// Stub for `three` and its ESM submodules (OrbitControls, CSS3DRenderer, etc.).
// jsdom has no WebGL and `three` ships as untranspiled ESM, so importing it in a
// Jest spec throws "Cannot use import statement outside a module". This returns a
// permissive no-op class for every named import. Mirrors the webLlmMock pattern.
class ThreeStub {
  domElement = document.createElement('div');
  position = { set: () => {}, copy: () => {} };
  rotation = { set: () => {} };
  scale = { set: () => {} };
  children: any[] = [];
  constructor(..._args: any[]) {}
  add() {
    return this;
  }
  remove() {
    return this;
  }
  set() {
    return this;
  }
  copy() {
    return this;
  }
  setSize() {}
  setPixelRatio() {}
  render() {}
  update() {}
  dispose() {}
  lookAt() {}
  setFromPoints() {
    return this;
  }
}

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => (prop === '__esModule' ? true : ThreeStub)
  }
);
