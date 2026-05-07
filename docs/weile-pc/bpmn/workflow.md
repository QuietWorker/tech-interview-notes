---
title: BPMN工作流引擎集成
outline: deep
---

# BPMN工作流引擎集成

## 重难点1：BPMN工作流引擎集成 - 自定义扩展与审核人配置

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：BPMN.js 前端建模 + Activiti 后端执行，moddleExtensions 扩展属性，动态配置审核维度，bpmnlint 规则校验，modeling.setColor 节点高亮</div>
  <ul>
    <li><strong>选型方案：</strong>BPMN.js (前端渲染) + Activiti (后端引擎)</li>
    <li><strong>扩展机制：</strong>利用 moddleExtensions 注入 activiti.json</li>
    <li><strong>审核配置：</strong>支持 6+ 种动态维度，通过 EL 表达式传递变量</li>
    <li><strong>流程校验：</strong>集成 bpmnlint，执行 15+ 条规范</li>
    <li><strong>效果数据：</strong>配置效率提升 80%，节点状态可视化毫秒级响应</li>
  </ul>
  <div class="one-liner">📌 一句话总结：基于 BPMN.js 构建可视化设计器，通过 Moddle 扩展实现 Activiti 属性绑定，结合动态审核人配置与自动化校验，打造低代码工作流引擎。</div>
</div>

### 问题1：为什么选择 BPMN.js？有没有考虑过其他方案？ {#q1-1}

<div class="original-text">
在实验室安全管理系统中，我们需要一个可视化的流程设计工具来配置仪器预约、危化品领用等业务的审批流。

主要考虑了几个因素：第一，标准化。BPMN 2.0 是国际通用的业务流程建模标准，业务人员能看懂。第二，生态成熟。BPMN.js 是 bpmn.io 官方提供的开源库，每周下载量巨大，文档和社区支持非常完善。第三，可扩展性。它提供了丰富的 API 和模块化架构，允许我们自定义调色板、属性面板和渲染逻辑。

业界主流的方案有几种：一是 LogicFlow，滴滴开源的，比较轻量，适合简单的流程图，但对 BPMN 标准支持不够深。二是 G6，蚂蚁金服的图可视化引擎，功能强大但需要自己实现 BPMN 的语义和交互，开发成本极高。三是 jsPlumb，老牌连线库，主要用于拓扑图，不适合复杂的业务流程建模。四是 BPMN.js，专门针对 BPMN 2.0 标准，天生支持 XML 导入导出，且能与 Activiti/Camunda 等后端引擎无缝对接。

我最终选择了 BPMN.js。核心理由是：它能直接生成符合 Activiti 规范的 XML，省去了前后端格式转换的麻烦；它的 Modeler 组件开箱即用，且支持通过 additionalModules 进行深度定制。落地后，我们通过封装 wl-bpmn 组件，实现了流程图的在线编辑、预览和状态高亮，极大提升了配置效率。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>选型对比：</strong>LogicFlow（轻量但不标准）、G6（成本高）、jsPlumb（非流程专用），选择 <strong>BPMN.js</strong></li>
    <li><strong>理由：</strong>BPMN 2.0 国际标准、Activiti 原生兼容、模块化扩展能力强</li>
    <li><strong>落地价值：</strong>XML 直通后端，无需转换；封装组件支持编辑/预览/高亮一体化</li>
  </ul>
</div>

### 问题2：BPMN.js 和 Activiti 是什么关系？ {#q1-2}

<div class="original-text">
简单来说，BPMN.js 是前端的"画笔"，Activiti 是后端的"发动机"。

BPMN.js 负责在浏览器里画出流程图，并生成符合 BPMN 2.0 标准的 XML 字符串。但这个 XML 只是静态的描述，它不知道如何执行。Activiti 是一个 Java 编写的工作流引擎，它能解析这个 XML，并根据定义的节点类型（如 UserTask）去驱动业务流程，比如触发数据库操作、发送通知或等待用户审批。

在我们的项目中，两者的衔接点在于 XML 属性扩展。原生的 BPMN 2.0 并没有定义"审核人是谁"这样的属性。为了让 Activiti 知道哪个用户该审核，我们需要在 XML 的 &lt;userTask&gt; 标签上增加 activiti:assignee 或 activiti:candidateGroups 属性。这就是为什么我们需要通过 moddleExtensions 来告诉 BPMN.js："请允许我在 XML 里写这些 Activiti 特有的属性，并且不要报错。"

</div>

<div class="memory-aid">
  <ul>
    <li><strong>分工：</strong>BPMN.js（前端建模/XML生成） + Activiti（后端解析/流程驱动）</li>
    <li><strong>衔接：</strong>通过 activiti:xxx 属性在 XML 中传递业务参数（如审核人 ID）</li>
    <li><strong>关键：</strong>前端必须支持 Activiti 命名空间，否则生成的 XML 后端无法识别</li>
  </ul>
</div>

### 问题3：moddleExtensions 扩展机制是怎么实现的？ {#q1-3}

<div class="original-text">
moddleExtensions 是 BPMN.js 提供的一种机制，用于扩展 BPMN 2.0 的基础模型。默认情况下，BPMN.js 只认识标准的 BPMN 元素（如 bpmn:UserTask）。如果我们在 XML 里写了 activiti:assignee，BPMN.js 可能会忽略它或者报错。

实现步骤如下：

1. 定义描述文件 (activiti.json)：我们创建了一个 JSON 文件，声明我们要扩展 bpmn:UserTask，并增加了 assignee, candidateGroups, candidateUsers, formKey 四个属性。

2. 注入建模器：在初始化 CustomModeler 时，将这个 JSON 描述文件传给 moddleExtensions 选项。

这样，BPMN.js 在解析和保存 XML 时，就会自动处理 activiti: 开头的属性，并将其正确地映射到元素的 businessObject.$attrs 中。

</div>

```js
// activiti.json
{
  "name": "UserTask",
  "isAbstract": true,
  "extends": ["bpmn:UserTask"],
  "properties": [
    { "name": "assignee", "isAttr": true, "type": "String" },
    { "name": "candidateGroups", "isAttr": true, "type": "String" },
    { "name": "candidateUsers", "isAttr": true, "type": "String" },
    { "name": "formKey", "isAttr": true, "type": "String" }
  ]
}
```

```js
// wl_bpmn.vue
import activitiModdleDescriptor from './activiti.json'

this.bpmnModeler = new CustomModeler({
  container: canvas,
  moddleExtensions: {
    activiti: activitiModdleDescriptor,
  },
  // ...
})
```

<div class="memory-aid">
  <ul>
    <li><strong>定义：</strong>编写 activiti.json 描述扩展属性和类型</li>
    <li><strong>注入：</strong>在 new Modeler 时通过 moddleExtensions 传入</li>
    <li><strong>效果：</strong>实现 XML 中 activiti:assignee 等属性的读写与持久化</li>
  </ul>
</div>

### 问题4：审核人动态配置具体有哪些维度？如何实现？ {#q1-4}

<div class="original-text">
为了满足不同业务场景（如仪器预约、危化品领用），我们设计了多维度的审核人配置。

配置维度：

1. 固定成员 (user)：指定具体的某个账号 ID。
2. 固定角色 (role)：指定某个角色 ID，拥有该角色的所有人都可审核。
3. 本部门负责人 (deptLeader)：动态获取申请人所在部门的领导。
4. 物资/仪器/实验室管理员 (itemManager)：根据业务类型动态关联对应的资源管理人。
5. 归属部门角色 (belongDeptRole)：特定业务（如危化品领用）中，指定申请部门内的特定角色。
6. 整改检查人 (jiancharen)：安全检查场景中，指定负责复查的人员。

实现逻辑：
在 task_assignee.vue 弹窗中，用户选择类型后，我们在 wl_bpmn.vue 的 setTaskAssignee 方法中将配置转换为 Activiti 识别的表达式。

</div>

```js
// wl_bpmn.vue - setTaskAssignee 方法片段
if (['user'].includes(res.opuser_type)) {
  assignee = res.nodeOperUserId // 直接赋值 ID
} else if (['role'].includes(res.opuser_type)) {
  candidateGroups = res.nodeOperUserJiaose.id // 赋值角色 ID
} else if (['currentDeptRole', 'belongDeptRole'].includes(res.opuser_type)) {
  // 使用 EL 表达式，后端运行时解析
  candidateUsers = `\${${res.opuser_type}_${res.nodeOperUserJiaose.id}}`
} else if (['itemManager', 'deptLeader'].includes(res.opuser_type)) {
  candidateUsers = `\${${res.opuser_type}}` // 变量名交给后端解析
}

modeling.updateProperties(shape, {
  'activiti:assignee': assignee,
  'activiti:candidateUsers': candidateUsers,
  'activiti:candidateGroups': candidateGroups,
})
```

<div class="memory-aid">
  <ul>
    <li><strong>维度：</strong>成员、角色、部门负责人、资源管理员、动态角色</li>
    <li><strong>实现：</strong>前端弹窗选择，转换为 assignee 或 candidateUsers/Groups</li>
    <li><strong>动态性：</strong>利用 Activiti 的 EL 表达式实现运行时动态找人</li>
  </ul>
</div>

### 问题5：流程校验做了哪些规则？怎么实现的？ {#q1-5}

<div class="original-text">
为了防止用户画出无法执行的流程图（如死循环、孤立节点），我们集成了 bpmnlint 校验模块。

校验规则（参考 packed-config.js）：

1. conditional-flows：条件分支的连线必须有条件表达式。
2. end-event-required：每个流程必须有结束节点。
3. no-disconnected：不能有孤立的节点（没有连线）。
4. no-duplicate-sequence-flows：不能有重复的连线。
5. start-event-required：必须有开始节点。
6. superfluous-gateway：不能有只有一个入口和一个出口的多余网关。

实现方式：

1. 引入模块：在 wl_bpmn.vue 中引入 lintModule 和打包好的配置 bpmnlintConfig。
2. 配置建模器：将校验模块加入 additionalModules。
3. 执行校验：调用 linting.lint() 方法，它会返回一个包含所有错误信息的对象。如果 Object.keys(results).length > 0，则提示用户修复。
</div>

```js
// wl_bpmn.vue
additionalModules: [lintModule, { linting: { bpmnlint: bpmnlintConfig } }]

// 执行校验
const linting = this.bpmnModeler.get('linting')
let res = await linting.lint()
if (Object.keys(res).length > 0) {
  // 校验失败，提示用户
}
```

<div class="memory-aid">
  <ul>
    <li><strong>规则：</strong>无孤立节点、必有始末、分支必带条件、无重复连线等 15+ 条</li>
    <li><strong>实现：</strong>集成 wl_bpmn-js-bpmnlint，通过 linting.lint() 异步校验</li>
    <li><strong>反馈：</strong>校验失败时阻断保存，并弹出 Alert 提示具体错误</li>
  </ul>
</div>

### 问题6：流程节点高亮怎么做的？已通过/审核中/已拒绝的颜色怎么设置？ {#q1-6}

<div class="original-text">
在流程实例运行过程中，我们需要直观地展示当前进度。这是通过 BPMN.js 的 modeling.setColor API 实现的。

实现步骤：

1. 接收状态数据：父组件传入 nodeColors 对象，结构如 { passNode: ['id1'], checkingNode: ['id2'] }。
2. 获取元素实例：通过 elementRegistry.get(id) 找到画布上的图形对象。
3. 应用颜色：遍历不同状态的 ID 列表，调用 modeling.setColor 设置填充色（fill）和边框色（stroke）。
</div>

```js
// wl_bpmn.vue - setNodeColor 方法
getColorByType(type){
  switch(type){
    case 'passNode': // 已通过 - 绿色
      return { fill: '#67C23A', stroke: '#333' };
    case 'checkingNode': // 审核中 - 橙色
      return { fill: '#E6A23C', stroke: '#333' };
    case 'refuseNode': // 已拒绝 - 红色
      return { fill: '#F56C6C', stroke: '#333' };
    case 'cancelNode': // 已取消 - 灰色
      return { fill: '#909399', stroke: '#333' };
  }
}

// 应用颜色
let shapes = [];
list.forEach((id)=>{
  let shape = elementRegistry.get(id);
  if(shape) shapes.push(shape);
});
modeling.setColor(shapes, conf);
```

<div class="memory-aid">
  <ul>
    <li><strong>API：</strong>modeling.setColor(shapes, 配置对象)</li>
    <li><strong>逻辑：</strong>父组件传入状态 ID 集合，遍历调用 setColor</li>
    <li><strong>配色：</strong>绿（通过）、橙（进行中）、红（拒绝）、灰（取消）</li>
  </ul>
</div>

### 问题7：BPMN XML 怎么保存和加载的？ {#q1-7}

<div class="original-text">
加载（Import）：
通过监听 xmlStr 属性变化，调用 bpmnModeler.importXML(xmlStr)。导入成功后，调用 canvas.zoom("fit-viewport") 让流程图自适应屏幕大小，并立即执行 setNodeColor 渲染历史状态。

保存（Export）：

1. 自动保存：监听 commandStack.changed 事件，每当用户在画布上有操作（拖拽、连线等），就调用 saveDiagram。
2. 获取字符串：调用 bpmnModeler.saveXML({ format: true }, (err, xml) => { this.bpmnStr = xml; })。
3. 提交：当用户点击业务表单的"保存"按钮时，通过 getBpmnStr() 方法获取最新的 XML 字符串存入数据库。
</div>

```js
// 加载
this.bpmnModeler.importXML(bpmnXmlStr, (err) => {
  if (err) {
    console.error(err);
  } else {
    this.bpmnStr = bpmnXmlStr;
  }
  let canvas = this.bpmnModeler.get("canvas");
  canvas.zoom("fit-viewport");
  this.setNodeColor(canvas);
});

// 保存
this.bpmnModeler.on("commandStack.changed", () => {
  this.saveDiagram();
});

saveDiagram() {
  this.bpmnModeler.saveXML({ format: true }, (err, xml) => {
    this.bpmnStr = xml;
  });
}
```

<div class="memory-aid">
  <ul>
    <li><strong>加载：</strong>importXML + zoom("fit-viewport") 自适应</li>
    <li><strong>保存：</strong>监听 commandStack.changed 实时更新内存中的 bpmnStr</li>
    <li><strong>获取：</strong>saveXML 异步回调获取格式化后的 XML 字符串</li>
  </ul>
</div>

### 问题8：能举一个具体的业务流程例子吗？ {#q1-8}

<div class="original-text">
以"仪器预约管理员审核"为例：

1. 开始节点：用户提交预约申请。
2. 提交节点 (form_submit)：第一个 UserTask，审核人设置为 \${tijiaoren}（即申请人自己），用于记录提交动作。
3. 审核节点 (form_audit)：第二个 UserTask，配置审核人为"仪器管理人"。
   - 在 task_assignee 弹窗中选择"审核类型：仪器管理人"。
   - 框架自动生成 XML 属性：<code>activiti:candidateUsers="${itemManager}"</code>。
4. 结束节点：审核通过后流程结束，系统自动更新预约状态为"成功"。
   如果在设计中漏掉了"结束节点"，bpmnlint 会在校验时报错 Process is missing end event，阻止保存。如果审核通过了，该节点在详情页会显示为绿色高亮。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>场景：</strong>仪器预约，提交，管理员审核，结束</li>
    <li><strong>配置：</strong>提交节点用变量 tijiaoren，审核节点用变量 itemManager</li>
    <li><strong>闭环：</strong>校验规则确保流程完整，颜色高亮反馈实时状态</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— BPMN 工作流引擎 · 面试笔记 ——</p>
