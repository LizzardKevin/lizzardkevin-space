# DevLog_7（SPACE 移动手感 · 碰撞 Debug · 固定 Physics Tick）

时间：2026-06-23 ~ 2026-06-24（DevLog_6 之后的 `space_main` 运行时排障、移动手感与物理步长修复）

## 本次目标

- 继续验证新 `space_main.glb` 在网页端的实际可走性，而不是只验证 Blender / GLB 节点存在。
- 判断“局部速度忽快忽慢”到底来自模型碰撞、角色控制器，还是运行时 timestep。
- 保留一个临时 debug 面板，让后续在真实浏览器里走动时可以直接看到速度、位置和当前接触的 `COL_*`。
- 修复第一人称移动使用动态 render `dt` 导致的体感漂移，并把走路/冲刺速度回到之前确认过的基线。

## 已完成产出

### 1) 临时移动 Debug 面板

- 新增 `apps/web/src/scenes/debug/spaceMovementDebug.ts`：
  - 定义 `space:movement-debug` dev-only telemetry event。
  - 建立 Rapier collider handle 到 `COL_*` 名称的调试 registry。
  - 提供 `registerSpaceCollisionDebugCollider` 和 `resolveSpaceCollisionDebugName`。
- 新增 `apps/web/src/scenes/debug/SpaceMovementDebugOverlay.tsx`：
  - 只在 `import.meta.env.DEV` 下显示。
  - 固定在 SPACE 左上角，不接收 pointer events。
  - 显示当前位置 `x/y/z`、实际水平速度、期望水平速度、actual/desired ratio、target speed、grounded、collision count、vertical velocity 和接触 collider 名称。
- 将 overlay 挂载到 `SpaceDesktopExperience`，用于真实 Chrome / Edge 手测。

### 2) `COL_*` 接触名称反查

- `GalleryFloorCollider` 注册由 `COL_ground` / `COL_floor` 切分出来的薄 box floor collider：
  - 名称格式类似 `COL_floor_xxx#0`。
  - 这样可以判断玩家是否踩在主要地面分片上。
- `ColColliders` 注册其它 `COL_*`：
  - `COL_inner_*` 使用 cuboid。
  - `COL_STAIR_*` / `COL_PLATFORM_*` / 墙体等非 floor collider 使用 trimesh。
  - `prop_*` fallback cuboid 会显示 `COL_xxx (fallback from prop_xxx)`。
- `SafetyGround` 注册为 `SAFETY_GROUND`：
  - 如果 debug 面板显示碰到了它，说明玩家已经掉到兜底地面，而不是正常展厅 floor。

### 3) 第一人称视角控制回退

- 曾尝试用自定义 guarded pointer lock controls 过滤异常 `movementY`，用于解决视角偶发瞬间看天/看地。
- 实测发现该版本导致第一人称视角完全无法移动。
- 因此保守回退到上一版 Drei `PointerLockControls`：
  - 先恢复可用性。
  - 视角跳闪问题保留为后续在 Drei 控制链路上做更小范围防护，而不是整套替换 controls。

### 4) 固定 Physics Tick，移除动态 render dt 对移动的影响

- 排查时一度怀疑 Vite dev server 或“服务器 tick”导致移动手感变化。
- 结论：Vite server 只负责 dev server / HMR，并不驱动 SPACE 物理 tick；真正的问题在浏览器运行时：
  - `@react-three/rapier` 的 `<Physics>` 默认固定 `1/60` step。
  - `PlayerController` 之前用 `useFrame((_, dt) => ...)` 记录动态 render-loop `dt`。
  - `useBeforePhysicsStep` 在固定 physics step 中又使用这个动态 `dtRef` 来计算移动。
  - 当一帧内补跑多个 physics step 或 render fps 波动时，同一个动态 render `dt` 可能被用于多个 physics step，导致体感漂移。
- 修复方式：
  - 在 `SpaceDesktopExperience` 显式设置 `SPACE_PHYSICS_TIME_STEP = 1 / 60`。
  - `<Physics gravity={[0, -9.81, 0]} timeStep={SPACE_PHYSICS_TIME_STEP}>`。
  - 在 `PlayerController` 中新增 `PLAYER_PHYSICS_TIME_STEP = 1 / 60`。
  - 移除 `dtRef` 和 `Math.min(dt, 0.05)`。
  - 物理移动、惯性、重力和 debug speed ratio 都使用固定 `PLAYER_PHYSICS_TIME_STEP`。

### 5) 移动速度回到确认基线

- 在排查期间曾把速度提高到两倍：
  - `WALK_SPEED = 4.9`
  - `SPRINT_SPEED = 7.7`
- fixed physics tick 修复后，速度被调回之前确认过的基线：
  - `WALK_SPEED = 2.45`
  - `SPRINT_SPEED = 3.85`
- 加减速仍保留原来的 smoothstep + lerp：
  - `MOVE_ACCEL = 11`
  - `MOVE_DECEL = 15`
  - 停止操作时继续有惯性衰减，而不是瞬停。

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| debug 面板显示速度 ratio 基本稳定，但体感仍像忽快忽慢 | 重新审视 speed 计算基准，发现 actual/desired 都使用同一个动态 `dtRef`，因此 ratio 本身掩盖了 render dt 与 physics step 混用的问题 |
| 误以为 Vite / server 在跑动态物理 tick | 确认 Vite 只负责 dev server / HMR；真正需要修的是浏览器端 R3F render loop `dt` 与 Rapier fixed timestep 的混用 |
| 自定义 pointer lock controls 试图过滤异常鼠标 delta，但导致视角无法移动 | 删除自定义 controls，回退 Drei `PointerLockControls`，后续只在已有控制链路上做局部防护 |
| 新 GLB 的碰撞问题难以只凭体感判断 | 建立 collider handle -> `COL_*` 名称 registry，并在左上角 overlay 实时显示当前接触对象 |
| 速度翻倍后更容易暴露 timestep 问题，但修复后速度过快 | fixed timestep 通过后，把速度回到 2.45 / 3.85 基线 |

## 当前验证状态

本轮已执行：

```text
node scripts/space-interaction-contract-test.mjs
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
npm run lint
npm run build:chunks
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/
```

- SPACE interaction contract：通过。
- TypeScript：通过。
- ESLint：通过。
- production build + chunk contract：通过。
- Vite dev server：`http://127.0.0.1:5173/` 返回 200。
- in-app Browser 自动化仍因当前 Codex 环境的 `sandboxPolicy` 元数据错误无法连接，因此 WebGPU / pointer lock 仍以真实浏览器手测为准。

## 下一步计划

1. **真实浏览器复测移动手感**：刷新 `5173`，用 debug overlay 观察 fixed tick 后速度、ratio、contact 是否稳定。
2. **继续定位鼠标视角跳闪**：保留 Drei `PointerLockControls`，在不替换整套 controls 的前提下处理 pointer lock 重进/焦点切换时的异常 delta。
3. **用 debug 数据回查模型碰撞**：如果某个区域仍卡顿，记录 overlay 的 `contact` 名称，回到 Blender 中检查对应 `COL_*` 是否重叠、未 Apply Scale 或法线/面片过碎。
4. **决定 debug overlay 的生命周期**：短期继续保留在 dev 环境；上线前可删除，或改成隐藏的开发开关。
5. **继续完善 `space_main` 资产规范**：把可见结构、碰撞代理、spawn marker、AO bake 和材质脚本保持为单一可重复流程。

## 相关文件索引

- SPACE 页面与 Physics：`apps/web/src/pages/SpaceDesktopExperience.tsx`
- 玩家控制：`apps/web/src/scenes/Player/PlayerController.tsx`
- 脚步与冲刺速度：`apps/web/src/scenes/Player/useFootsteps.ts`
- 移动 debug telemetry：`apps/web/src/scenes/debug/spaceMovementDebug.ts`
- 移动 debug overlay：`apps/web/src/scenes/debug/SpaceMovementDebugOverlay.tsx`
- `COL_*` collider 生成：`apps/web/src/scenes/collision/colColliders.tsx`
- floor collider 切分：`apps/web/src/scenes/gallery/GalleryFloorCollider.tsx`
- safety ground：`apps/web/src/scenes/gallery/SafetyGround.tsx`
- SPACE interaction contract：`scripts/space-interaction-contract-test.mjs`
