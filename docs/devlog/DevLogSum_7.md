这轮集中查 SPACE 移动忽快忽慢的问题。我加了 dev-only 移动 debug overlay，以及 collider handle 到 `COL_*` 名称的反查；在真实浏览器里可以直接看位置、实际/期望速度、ratio、grounded 和当前接触体。自定义 pointer lock controls 会让视角完全不能动，所以先退回 Drei。

问题不在所谓的“服务器/Vite 动态 tick”，而是浏览器端 R3F render `dt` 混用了 Rapier 固定 `1/60` physics step。现在显式设置 `<Physics timeStep={1 / 60}>`，`PlayerController` 也使用同一固定 timestep；移动速度则从临时翻倍值调回 2.45 / 3.85。SPACE interaction contract、TypeScript、lint、build 和 Vite 5173 本地服务均已验证。
