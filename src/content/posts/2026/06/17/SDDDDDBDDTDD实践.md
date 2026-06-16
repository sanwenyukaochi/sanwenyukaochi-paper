这几个缩写经常一起出现，但它们不是同一个维度的东西。

```text
DDD = Domain-Driven Design
SDD = Specification-Driven Development / Story-Driven Development
BDD = Behavior-Driven Development
TDD = Test-Driven Development
```

其中 **DDD、BDD、TDD** 比较固定，**SDD** 的含义不如前三个统一，要看上下文。

---

## 1. DDD：Domain-Driven Design

中文一般叫：

> 领域驱动设计

DDD 关注的是：

> 如何围绕业务领域来设计软件模型。

它主要解决的问题是：

```text
业务复杂了以后，代码应该怎么组织？
业务规则应该放在哪里？
实体、值对象、聚合、领域服务怎么划分？
系统边界怎么设计？
```

DDD 更偏向 **业务建模和架构设计**。

常见概念：

```text
领域
子域
限界上下文
实体
值对象
聚合
聚合根
领域服务
领域事件
资源库
```

一句话理解：

> DDD 是为了让代码结构和业务模型保持一致。

---

## 2. SDD：Specification-Driven Development / Story-Driven Development

SDD 不是一个特别统一的缩写，常见有两种理解。

### 第一种：Specification-Driven Development

中文可以理解为：

> 规格驱动开发 / 规范驱动开发

它关注的是：

> 先把需求规格、接口规范、业务规则说明清楚，再进行开发。

比如先定义：

```text
接口文档
数据结构
状态流转规则
业务约束
验收标准
异常场景
```

然后代码按照这些 specification 去实现。

这种 SDD 更偏向：

```text
先定义清楚“系统应该是什么样”
再根据规格开发
```

---

### 第二种：Story-Driven Development

中文可以理解为：

> 用户故事驱动开发

它关注的是：

> 从用户故事出发，把需求拆成一个个可交付、可验收的小场景。

常见格式：

```text
作为一个 <角色>
我希望 <完成某件事>
以便 <获得某种价值>
```

例如：

```text
作为一个用户
我希望创建一笔订单
以便购买餐厅中的商品
```

这种 SDD 更接近敏捷开发中的用户故事拆分。

---

## 3. BDD：Behavior-Driven Development

中文一般叫：

> 行为驱动开发

BDD 关注的是：

> 用业务可读的方式描述系统行为，并用这些行为作为验收和测试依据。

BDD 常用 Gherkin 语法：

```gherkin
Feature: 创建订单

  Scenario: 用户创建订单成功
    Given 餐厅正在营业
    And 用户选择了有效商品
    When 用户提交订单
    Then 系统应该创建一笔待支付订单
```

BDD 的核心不是“测试工具”，而是：

> 让业务、测试、开发用同一种语言描述系统行为。

常见工具：

```text
Cucumber
Serenity BDD
SpecFlow
JBehave
```

一句话理解：

> BDD 是把需求行为写成可读、可执行的验收场景。

---

## 4. TDD：Test-Driven Development

中文一般叫：

> 测试驱动开发

TDD 关注的是：

> 先写测试，再写实现代码。

经典流程是：

```text
Red    写一个失败的测试
Green  写最少代码让测试通过
Refactor 重构代码，保持测试通过
```

例如你要实现订单取消逻辑，先写测试：

```java
@Test
void should_not_cancel_paid_order() {
    // given 已支付订单

    // when 取消订单

    // then 抛出异常
}
```

然后再写领域代码让测试通过。

一句话理解：

> TDD 是用测试驱动代码设计和实现。

---

# 5. 它们之间的区别

| 缩写  | 全称                                     | 中文        | 主要关注点          |
| --- | -------------------------------------- | --------- | -------------- |
| DDD | Domain-Driven Design                   | 领域驱动设计    | 业务建模、架构边界、领域模型 |
| SDD | Specification/Story-Driven Development | 规格/故事驱动开发 | 需求规格、用户故事、验收标准 |
| BDD | Behavior-Driven Development            | 行为驱动开发    | 用业务语言描述系统行为    |
| TDD | Test-Driven Development                | 测试驱动开发    | 先写测试，再写实现      |

---

# 6. 可以这样理解它们的关系

从需求到代码，可以按这个顺序理解：

```text
DDD：先理解业务领域，划分模型和边界
SDD：把需求整理成规格或用户故事
BDD：把用户故事写成可验收的行为场景
TDD：用测试驱动具体代码实现
```

例如“创建订单”这个需求：

```text
DDD：
识别订单、订单项、餐厅、客户、金额、订单聚合

SDD：
写清楚创建订单的业务规格和用户故事

BDD：
用 Given / When / Then 描述创建订单成功或失败的场景

TDD：
针对 Order.create()、Order.cancel() 等方法先写单元测试，再实现代码
```

---

## 7. 最简单的记忆方式

```text
DDD：业务模型怎么设计
SDD：需求规格怎么描述
BDD：系统行为怎么验收
TDD：代码实现怎么测试驱动
```

它们不是互斥关系，而是可以配合使用。
在一个复杂业务系统里，比较理想的链路是：

```text
DDD 建模 → SDD/用户故事 → BDD 验收场景 → TDD 编码实现
```




推荐顺序可以这样理解：

```text
产品需求
  ↓
SDD：先把需求讲清楚，形成用户故事 / 规格
  ↓
DDD：围绕这个需求做领域建模
  ↓
BDD：把需求转成可验收的业务场景
  ↓
TDD：针对领域行为和用例写测试，再写代码实现
```

也就是：

```text
SDD → DDD → BDD → TDD
```

但真实开发中，**DDD 和 BDD 会互相修正**。你不会一次性建模完全正确，而是通过 BDD 场景发现模型缺失，再回头调整 DDD 模型。

---

# 一、先给一个产品需求

假设产品经理提出一个需求：

> 用户可以提交 AI 图片生成任务。
> 系统接收到任务后，调用外部模型平台创建任务。
> 如果创建成功，系统保存任务信息，任务状态为“处理中”。
> 用户可以通过任务 ID 查询任务状态。
> 如果外部模型平台生成完成，系统返回图片地址。

这个需求一开始是产品语言，还不能直接写代码。

---

# 二、第一步：SDD，先把需求变成“故事 / 规格”

这里的 SDD 可以理解为：

> Story-Driven Development，用户故事驱动开发
> 或 Specification-Driven Development，规格驱动开发

它的目标是把产品经理的一句话，拆成开发、测试、业务都能理解的需求规格。

## 1. 用户故事

```text
作为一个调用方，
我希望提交 AI 图片生成任务，
以便异步获得生成后的图片结果。
```

## 2. 需求规格

进一步整理成规则：

```text
1. 调用方提交任务时，必须提供模型、提示词、渠道信息。
2. 系统收到任务后，需要生成内部任务 ID。
3. 系统调用外部模型平台创建任务。
4. 如果外部平台创建成功，系统保存任务。
5. 新任务初始状态为 PROCESSING。
6. 如果外部平台创建失败，系统不能保存为成功任务。
7. 用户可以通过 taskId 查询任务。
8. 查询时，如果任务不存在，返回任务不存在。
9. 如果任务完成，返回生成结果 URL。
```

这一阶段不关心代码怎么写，主要是回答：

> 需求到底是什么？
> 业务规则是什么？
> 成功和失败分别是什么？

---

# 三、第二步：DDD，根据需求做领域建模

有了需求规格后，开始做 DDD。

DDD 不是直接写 Service，而是先识别领域概念。

## 1. 找业务主体

这个需求里最核心的业务主体是：

```text
任务
```

所以可以建模为：

```text
Task
```

它是实体，因为它有唯一身份，并且状态会变化。

```text
Task
├── taskId
├── model
├── prompt
├── channel
├── status
├── platformTaskId
└── resultUrl
```

---

## 2. 找值对象

有些概念不需要独立身份，只是表达一个值，可以设计为值对象。

```text
TaskId
Prompt
ModelCode
Channel
TaskStatus
ImageResult
```

例如：

```text
TaskId：任务 ID
Prompt：提示词
ModelCode：模型编码
TaskStatus：任务状态
```

---

## 3. 找聚合根

这个需求里，`Task` 可以作为聚合根。

因为外部操作任务时，应该通过 `Task` 来完成：

```text
创建任务
标记为处理中
绑定外部平台任务 ID
标记为成功
标记为失败
```

而不是外部随便改字段。

---

## 4. 找领域行为

不要一上来写：

```java
task.setStatus(PROCESSING);
task.setResultUrl(url);
```

而应该思考业务行为：

```text
Task.create(...)
Task.markProcessing(...)
Task.bindPlatformTask(...)
Task.complete(...)
Task.fail(...)
```

例如：

```java
public void complete(ImageResult result) {
    if (this.status != TaskStatus.PROCESSING) {
        throw new TaskDomainException("Only processing task can be completed");
    }

    this.status = TaskStatus.SUCCESS;
    this.result = result;
}
```

这一步的重点是：

> 业务规则应该放在领域模型里，而不是散落在应用服务里。

---

## 5. 找领域服务

如果行为属于 `Task` 自己，就放在 `Task` 里。

但如果行为涉及多个对象，或者无法自然归属于某个实体，可以考虑领域服务。

比如：

```text
根据模型类型选择对应模型平台
校验模型是否支持图片生成
计算任务消耗
```

可以设计为：

```text
TaskDomainService
ModelPluginSelector
ConsumptionCalculator
```

---

## 6. 找领域事件

任务状态变化后，可能需要通知其他模块。

例如：

```text
TaskCreatedEvent
TaskSubmittedEvent
TaskCompletedEvent
TaskFailedEvent
```

事件表示已经发生的事实。

```text
任务已创建
任务已提交
任务已完成
任务已失败
```

---

## 7. 找资源库

任务需要保存和查询，所以定义资源库接口：

```java
public interface TaskRepository {

    void save(Task task);

    Optional<Task> findById(TaskId taskId);
}
```

注意，这里只是领域或应用层定义接口，不关心它底层是 MyBatis、JPA 还是 PostgreSQL。

---

# 四、第三步：BDD，把需求变成验收场景

DDD 解决的是模型设计问题。

BDD 解决的是：

> 这个需求怎么验收？

BDD 用业务可读的方式描述系统行为。

例如：

```gherkin
Feature: AI 图片生成任务

  Scenario: 用户提交 AI 图片生成任务成功
    Given 调用方提供了有效的图片生成参数
    And 外部模型平台可以成功创建任务
    When 调用方提交图片生成任务
    Then 系统应该返回内部任务 ID
    And 系统应该保存任务信息
    And 任务状态应该是处理中
```

再写失败场景：

```gherkin
Scenario: 外部模型平台创建任务失败
  Given 调用方提供了有效的图片生成参数
  And 外部模型平台创建任务失败
  When 调用方提交图片生成任务
  Then 系统不应该保存为成功任务
  And 系统应该返回创建失败提示
```

查询场景：

```gherkin
Scenario: 用户查询已完成的任务
  Given 系统中存在一个已完成的图片生成任务
  When 调用方根据任务 ID 查询任务结果
  Then 系统应该返回任务状态为成功
  And 系统应该返回生成图片地址
```

BDD 的重点不是测某个方法，而是描述：

> 从业务角度看，系统应该表现出什么行为。

---

# 五、第四步：TDD，先写测试，再写实现

BDD 场景确定后，就进入具体编码。

TDD 是更靠近代码层面的实践。

例如你要实现 `Task.complete()`，先写测试：

```java
@Test
void should_complete_processing_task() {
    Task task = Task.create(
            new TaskId("task-001"),
            new Prompt("一只猫"),
            ModelCode.GPT_IMAGE
    );

    task.markProcessing();
    task.complete(new ImageResult("https://example.com/cat.png"));

    assertEquals(TaskStatus.SUCCESS, task.getStatus());
}
```

再写异常场景：

```java
@Test
void should_not_complete_failed_task() {
    Task task = Task.create(
            new TaskId("task-001"),
            new Prompt("一只猫"),
            ModelCode.GPT_IMAGE
    );

    task.fail("platform error");

    assertThrows(TaskDomainException.class, () -> {
        task.complete(new ImageResult("https://example.com/cat.png"));
    });
}
```

然后再写最小代码让测试通过。

TDD 的节奏是：

```text
Red：先写失败测试
Green：写最少代码让测试通过
Refactor：重构代码，保持测试通过
```

---

# 六、完整链路串起来

对于“提交 AI 图片生成任务”这个需求，可以这样落地：

```text
1. 产品经理提出需求
   用户可以提交 AI 图片生成任务，并查询任务结果。

2. SDD
   整理用户故事、业务规则、成功失败条件。

3. DDD
   识别 Task、TaskId、Prompt、ModelCode、TaskStatus。
   判断 Task 是聚合根。
   设计 Task.create、Task.complete、Task.fail 等领域行为。
   定义 TaskRepository、TaskCreatedEvent。

4. BDD
   写提交任务成功、平台失败、查询成功、任务不存在等验收场景。

5. TDD
   针对 Task 聚合根、TaskDomainService、ApplicationService 写测试。
   先写测试，再实现代码。

6. 编码实现
   实现领域模型、应用服务、资源库适配器、外部平台适配器。

7. 验收
   跑单元测试、集成测试、BDD 场景测试。
```

---

# 七、它们各自负责什么

| 阶段  | 关注点      | 产物                     |
| --- | -------- | ---------------------- |
| SDD | 需求是什么    | 用户故事、需求规格、业务规则         |
| DDD | 业务模型怎么设计 | 实体、值对象、聚合、领域服务、领域事件    |
| BDD | 系统行为怎么验收 | Given / When / Then 场景 |
| TDD | 代码怎么可靠实现 | 单元测试、领域测试、实现代码         |

---

# 八、最推荐的实际顺序

我建议你这样记：

```text
先 SDD：把需求说清楚
再 DDD：把业务模型设计清楚
再 BDD：把验收行为写清楚
最后 TDD：用测试驱动代码实现
```

一句话：

> SDD 负责把需求讲清楚，DDD 负责把模型设计清楚，BDD 负责把行为验收清楚，TDD 负责把代码实现正确。
