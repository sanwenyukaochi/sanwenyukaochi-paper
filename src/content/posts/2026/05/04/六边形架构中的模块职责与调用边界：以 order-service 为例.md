---
title: 六边形架构中的模块职责与调用边界：以 order-service 为例
author: 三文鱼烤翅
pubDatetime: 2026-05-04T12:30:00+08:00
slug: hexagonal-architecture-order-service-module-boundary
featured: true
draft: false
tags:
 - DDD
 - Hexagonal Architecture
 - Clean Architecture
 - Spring Boot
 - Java
description: "以 order-service 为例，拆解六边形架构中 application、domain-core、application-service、dataaccess、messaging、container 等模块的职责、依赖关系和调用边界。"

---

## 背景

在 Java 后端项目中，很多人一开始都会使用传统三层架构：

```text
Controller -> Service -> Repository
```

这种结构简单直接，适合业务不复杂的项目。

但是当系统开始涉及订单、支付、消息、状态流转、领域规则、外部系统集成时，传统三层架构很容易变成下面这样：

```text
Controller 越来越重
Service 越来越臃肿
Repository 被到处调用
业务规则散落在各个地方
领域对象只剩 getter/setter
```

这时，引入六边形架构，也就是 Ports and Adapters Architecture，可以更好地控制模块边界。

它的核心目标不是让项目看起来更复杂，而是让业务核心保持稳定，让数据库、消息队列、HTTP、第三方接口这些技术细节变得可替换、可测试、可维护。

本文以如下 `order-service` 模块结构为例，拆解六边形架构中各模块的职责、依赖关系和调用边界。

```text
order-service
├── order-application
├── order-container
├── order-dataaccess
├── order-domain
│   ├── order-application-service
│   └── order-domain-core
└── order-messaging
```

## 问题

很多人看到这种多模块结构，容易把它误解成传统三层架构的拆包版本：

```text
Controller -> Service -> Repository
```

但这种理解是不准确的。

六边形架构真正关心的不是“代码分几层”，而是“依赖方向”和“业务核心是否被技术细节污染”。

传统三层架构在复杂业务中常见的问题是：

* Controller 直接感知 Repository
* Service 同时处理业务规则、事务、数据库、消息发送
* JPA Entity 和领域对象混在一起
* MQ Listener 收到消息后直接改数据库
* 领域对象只负责存数据，不负责保护业务规则
* 外部技术变化会影响业务核心代码

比如订单支付成功后，如果消息监听器直接这样写：

```java
public void paymentCompleted(PaymentResponse response) {
    OrderEntity order = orderJpaRepository.findById(response.orderId()).orElseThrow();
    order.setStatus(OrderStatus.PAID);
    orderJpaRepository.save(order);
}
```

这段代码的问题不只是“写在 Listener 里不好看”，而是它绕过了订单领域规则。

如果订单状态只能从 `PENDING` 变成 `PAID`，这个规则就不应该散落在消息层、Controller 层或普通 Service 里，而应该由 `Order` 聚合自己保护。

## 推荐方案

六边形架构推荐把系统拆成两类东西：

```text
业务核心
外部适配器
```

业务核心通过端口和外部世界交互。

整体调用关系可以理解为：

```text
外部世界
  ↓
输入适配器 Adapter In
  ↓
输入端口 Port In
  ↓
应用服务 Application Service
  ↓
领域模型 Domain Model
  ↓
输出端口 Port Out
  ↓
输出适配器 Adapter Out
  ↓
外部系统
```

最重要的原则是：

```text
外层依赖内层
内层不依赖外层
```

也就是说：

* Controller 可以依赖 Application Service
* Application Service 可以依赖 Domain Core
* DataAccess 可以依赖 Application Service 定义的输出端口
* Messaging 可以依赖 Application Service 定义的输入端口和输出端口
* Domain Core 不应该知道 Spring、JPA、Kafka、RabbitMQ、Redis、HTTP

在这个结构里，业务核心不是被数据库和消息队列驱动，而是由应用层编排，通过端口调用外部能力。

## 基本用法

以创建订单为例，Controller 不应该直接处理业务规则，也不应该直接调用 JPA Repository。

它只负责把 HTTP 请求转换成应用层 Command，然后调用输入端口：

```java
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderApplicationService;

    @PostMapping("/orders")
    public CreateOrderResponse createOrder(@RequestBody CreateOrderRequest request) {
        CreateOrderCommand command = CreateOrderCommand.from(request);
        return orderApplicationService.createOrder(command);
    }
}
```

这里的关键点是：

```text
Controller 只调用 input port
```

它不应该直接依赖：

```text
JpaRepository
KafkaTemplate
RabbitTemplate
RedisTemplate
数据库 Mapper
领域对象复杂状态修改逻辑
```

应用服务再负责用例编排：

```java
@Service
@RequiredArgsConstructor
public class OrderApplicationServiceImpl implements OrderApplicationService {

    private final OrderCreateCommandHandler orderCreateCommandHandler;

    @Override
    @Transactional
    public CreateOrderResponse createOrder(CreateOrderCommand command) {
        return orderCreateCommandHandler.createOrder(command);
    }
}
```

真正的业务规则交给领域对象或领域服务处理。

这样 Controller、Application Service、Domain Core 的职责会更清晰。

## 核心用法

### order-container：启动装配层

`order-container` 是整个服务的启动模块，也可以理解为 Composition Root。

它负责：

```text
Spring Boot 启动类
Bean 扫描
模块装配
配置文件加载
启动整个 order-service
```

常见内容包括：

```text
OrderServiceApplication.java
BeanConfiguration.java
application.yml
```

`order-container` 可以依赖其他所有模块，因为它的职责就是把系统组装起来。

但是它不应该写业务代码。

不推荐：

```java
@SpringBootApplication
public class OrderServiceApplication {

    public void createOrder() {
        // 业务逻辑
    }
}
```

推荐：

```java
@SpringBootApplication
public class OrderServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
```

`order-container` 只负责启动和装配，不负责订单规则、支付规则和消息处理逻辑。

### order-application：HTTP 输入适配器

`order-application` 是 HTTP 请求进入系统的入口。

它负责：

```text
Controller
REST Request DTO
参数校验
把 HTTP 请求转换成 Command
调用 input port
返回 Response
```

示例：

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/orders")
public class OrderController {

    private final OrderApplicationService orderApplicationService;

    @PostMapping
    public CreateOrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderApplicationService.createOrder(
            CreateOrderCommand.from(request)
        );
    }
}
```

这一层的职责是“适配 HTTP”，不是“实现业务”。

所以它应该保持薄一些：

```text
HTTP Request -> Command -> Input Port -> Response
```

### order-domain-core：纯领域核心

`order-domain-core` 是整个系统最核心、最稳定的部分。

它负责表达真正的业务规则。

这里应该放：

```text
Aggregate Root
Entity
Value Object
Domain Service
Domain Event
Domain Exception
领域枚举
业务规则
```

例如：

```text
Order
OrderItem
Product
Money
OrderStatus
OrderDomainService
OrderCreatedEvent
OrderPaidEvent
OrderCancelledEvent
OrderDomainException
```

这里不应该出现：

```text
@RestController
@Service
@Component
@Entity
JpaRepository
KafkaTemplate
RabbitTemplate
RedisTemplate
HTTP Client
Spring Security
```

严格一点说，`order-domain-core` 最好是一个纯 Java 模块。

比如订单支付，不推荐在外部直接改状态：

```java
order.setOrderStatus(OrderStatus.PAID);
```

更推荐让领域对象自己保护状态：

```java
public class Order extends AggregateRoot<OrderId> {

    private OrderStatus orderStatus;

    public void pay() {
        if (this.orderStatus != OrderStatus.PENDING) {
            throw new OrderDomainException("Order is not in correct state for pay operation");
        }
        this.orderStatus = OrderStatus.PAID;
    }

    public void approve() {
        if (this.orderStatus != OrderStatus.PAID) {
            throw new OrderDomainException("Order is not paid for approve operation");
        }
        this.orderStatus = OrderStatus.APPROVED;
    }

    public void cancel() {
        if (this.orderStatus == OrderStatus.APPROVED) {
            throw new OrderDomainException("Approved order cannot be cancelled");
        }
        this.orderStatus = OrderStatus.CANCELLED;
    }
}
```

这样订单状态规则就集中在 `Order` 聚合内部，不会散落在 Controller、Service、MQ Listener 中。

### order-application-service：用例编排层

`order-application-service` 是六边形架构里的应用服务层。

它负责：

```text
用例编排
事务边界
调用领域对象
调用输出端口
发布领域事件
处理 Command
返回 Response
```

这里通常会放：

```text
ports.input.service
ports.input.message.listener
ports.output.repository
ports.output.message.publisher
dto.command
dto.response
mapper
handler
saga
```

创建订单的编排可以写成：

```java
@Component
@RequiredArgsConstructor
public class OrderCreateCommandHandler {

    private final OrderDomainService orderDomainService;
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final RestaurantRepository restaurantRepository;
    private final OrderCreatedPaymentRequestMessagePublisher paymentRequestMessagePublisher;
    private final OrderDataMapper orderDataMapper;

    public CreateOrderResponse createOrder(CreateOrderCommand command) {
        Customer customer = customerRepository.findCustomer(command.customerId());
        Restaurant restaurant = restaurantRepository.findRestaurantInformation(command.restaurantId());

        Order order = orderDataMapper.createOrderCommandToOrder(command);

        OrderCreatedEvent orderCreatedEvent =
            orderDomainService.validateAndInitiateOrder(order, restaurant);

        Order savedOrder = orderRepository.save(order);

        paymentRequestMessagePublisher.publish(orderCreatedEvent);

        return orderDataMapper.orderToCreateOrderResponse(savedOrder);
    }
}
```

需要注意：

```java
private final OrderRepository orderRepository;
```

这里的 `OrderRepository` 不应该是 Spring Data JPA Repository。

它应该是 application-service 定义的输出端口：

```text
ports.output.repository.OrderRepository
```

真正的 JPA 实现应该放在 `order-dataaccess` 里。

### order-dataaccess：数据库输出适配器

`order-dataaccess` 是数据库适配器模块。

它负责：

```text
JPA Entity
Spring Data JpaRepository
Repository Adapter
数据库 Mapper
持久化实现
```

典型结构如下：

```text
order-dataaccess
├── order
│   ├── entity
│   │   ├── OrderEntity
│   │   └── OrderItemEntity
│   ├── mapper
│   │   └── OrderDataAccessMapper
│   ├── repository
│   │   └── OrderJpaRepository
│   └── adapter
│       └── OrderRepositoryImpl
```

它实现 application-service 中定义的输出端口：

```java
@Component
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderJpaRepository orderJpaRepository;
    private final OrderDataAccessMapper orderDataAccessMapper;

    @Override
    public Order save(Order order) {
        OrderEntity orderEntity = orderDataAccessMapper.orderToOrderEntity(order);
        OrderEntity savedEntity = orderJpaRepository.save(orderEntity);
        return orderDataAccessMapper.orderEntityToOrder(savedEntity);
    }
}
```

这就是依赖倒置。

不是应用层依赖数据库实现，而是数据库适配器依赖应用层定义的接口。

### order-messaging：消息输入和输出适配器

`order-messaging` 负责消息相关的技术实现。

它有两类职责。

第一类是消费消息，也就是输入适配器：

```text
PaymentResponseMessageListener
RestaurantApprovalResponseMessageListener
```

比如支付服务发回支付成功消息，MQ Listener 收到后，不应该直接改数据库，而应该调用 application-service 的输入端口。

不推荐：

```java
public void paymentCompleted(PaymentResponse response) {
    OrderEntity order = orderJpaRepository.findById(response.orderId()).orElseThrow();
    order.setStatus(OrderStatus.PAID);
    orderJpaRepository.save(order);
}
```

推荐：

```java
public void paymentCompleted(PaymentResponse response) {
    paymentResponseMessageListener.paymentCompleted(response);
}
```

然后由应用层编排：

```java
order.pay();
orderRepository.save(order);
```

第二类是发布消息，也就是输出适配器：

```text
OrderCreatedPaymentRequestMessagePublisher
OrderPaidRestaurantRequestMessagePublisher
```

它们实现 application-service 中定义的 publisher port：

```java
@Component
@RequiredArgsConstructor
public class OrderCreatedPaymentRequestKafkaMessagePublisher
        implements OrderCreatedPaymentRequestMessagePublisher {

    private final KafkaTemplate<String, PaymentRequestAvroModel> kafkaTemplate;
    private final OrderMessagingDataMapper orderMessagingDataMapper;

    @Override
    public void publish(OrderCreatedEvent domainEvent) {
        PaymentRequestAvroModel message =
            orderMessagingDataMapper.orderCreatedEventToPaymentRequestAvroModel(domainEvent);

        kafkaTemplate.send("payment-request-topic", message.getId(), message);
    }
}
```

所以 `order-messaging` 既可能是：

```text
Adapter In
```

也可能是：

```text
Adapter Out
```

关键看它当前是在消费消息，还是在发送消息。

## 项目中怎么落地

在真实项目里，模块依赖关系可以按下面方式设计：

```text
order-domain-core
    无业务模块依赖，最纯净

order-application-service
    depends on order-domain-core

order-application
    depends on order-application-service

order-dataaccess
    depends on order-application-service
    depends on order-domain-core

order-messaging
    depends on order-application-service
    depends on order-domain-core

order-container
    depends on all
```

画成依赖图大概是：

```text
                       order-container
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
order-application      order-dataaccess       order-messaging
      │                      │                      │
      └──────────────┬───────┴──────────────┬───────┘
                     ↓                      ↓
          order-application-service
                     ↓
              order-domain-core
```

最重要的是依赖方向：

```text
外层模块依赖内层模块
内层模块不能依赖外层模块
```

也就是说：

```text
Controller 可以依赖 Application Service
Application Service 可以依赖 Domain Core
DataAccess 可以依赖 Application Service 的 Port 接口
Messaging 可以依赖 Application Service 的 Port 接口
Domain Core 不知道任何外部技术
```

### 创建订单的完整调用链

假设用户调用：

```text
POST /orders
```

推荐调用链是：

```text
1. order-application
   OrderController.createOrder(request)

2. order-application-service
   OrderApplicationService.createOrder(command)

3. order-application-service
   OrderCreateCommandHandler.createOrder(command)

4. order-application-service 调 output port
   CustomerRepository.findCustomer(...)
   RestaurantRepository.findRestaurantInformation(...)

5. order-dataaccess 实现 output port
   CustomerRepositoryImpl
   RestaurantRepositoryImpl

6. order-domain-core
   OrderDomainService.validateAndInitiateOrder(order, restaurant)
   Order.initializeOrder()
   Order.validateOrder()
   Order.validatePrice()

7. order-application-service 调 output port
   OrderRepository.save(order)

8. order-dataaccess
   OrderRepositoryImpl.save(order)
   OrderEntityMapper
   OrderJpaRepository.save(entity)

9. order-application-service 发布领域事件
   OrderCreatedPaymentRequestMessagePublisher.publish(orderCreatedEvent)

10. order-messaging
    Kafka / RabbitMQ Publisher 发送 PaymentRequest

11. order-application
    返回 CreateOrderResponse
```

这条链路里有几个边界一定要守住：

```text
Controller 不知道 JPA
Application Service 不知道 KafkaTemplate
Domain Core 不知道 Spring
DataAccess 不知道 Controller
Messaging 不直接操作数据库状态
```

### 支付成功消息的完整调用链

假设 payment-service 发回支付成功消息：

```text
PaymentResponse
```

推荐调用链是：

```text
1. order-messaging
   PaymentResponseKafkaListener 接收消息

2. order-messaging
   把 Avro / JSON 消息转成 application-service 的 message dto

3. order-application-service
   PaymentResponseMessageListener.paymentCompleted(response)

4. order-application-service
   OrderPaymentSaga.process(response)

5. order-application-service
   OrderRepository.findById(...)

6. order-dataaccess
   OrderRepositoryImpl.findById(...)

7. order-domain-core
   order.pay()

8. order-application-service
   OrderRepository.save(order)

9. order-application-service
   OrderPaidRestaurantRequestMessagePublisher.publish(orderPaidEvent)

10. order-messaging
    发送 RestaurantApprovalRequest
```

这里最重要的是：

```text
MQ Listener 不应该直接 order.setStatus(PAID)
```

而应该让领域对象自己完成状态变化：

```java
order.pay();
```

这样订单状态规则才不会散落到消息层。

## 不推荐写法和推荐写法

### Controller 直接调用 Repository

不推荐：

```java
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderJpaRepository orderJpaRepository;
}
```

推荐：

```java
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderApplicationService;
}
```

Controller 不应该知道数据库怎么查，也不应该知道订单怎么保存。

### Application Service 直接依赖 JpaRepository

不推荐：

```java
@Service
@RequiredArgsConstructor
public class OrderApplicationServiceImpl {

    private final OrderJpaRepository orderJpaRepository;
}
```

推荐：

```java
@Service
@RequiredArgsConstructor
public class OrderApplicationServiceImpl {

    private final OrderRepository orderRepository;
}
```

其中 `OrderRepository` 是 application-service 定义的 output port。

### Domain Core 里出现 JPA 注解

不推荐：

```java
@Entity
@Table(name = "orders")
public class Order {
}
```

推荐分开：

```text
domain-core:
    Order

dataaccess:
    OrderEntity
```

然后通过 Mapper 转换：

```text
Order <-> OrderEntity
```

这样领域模型不会被数据库结构污染。

### MQ Listener 直接改状态

不推荐：

```java
public void paymentCompleted(PaymentResponse response) {
    OrderEntity order = orderJpaRepository.findById(response.orderId()).orElseThrow();
    order.setStatus(OrderStatus.PAID);
    orderJpaRepository.save(order);
}
```

推荐：

```java
public void paymentCompleted(PaymentResponse response) {
    paymentResponseMessageListener.paymentCompleted(response);
}
```

然后在应用层：

```java
order.pay();
orderRepository.save(order);
```

状态规则应该在领域对象里，而不是消息适配器里。

### 领域对象只有 getter/setter

不推荐：

```java
@Getter
@Setter
public class Order {

    private OrderStatus orderStatus;
}
```

推荐：

```java
public class Order {

    private OrderStatus orderStatus;

    public void pay() {
        validateOrderCanBePaid();
        this.orderStatus = OrderStatus.PAID;
    }

    private void validateOrderCanBePaid() {
        if (this.orderStatus != OrderStatus.PENDING) {
            throw new OrderDomainException("Order cannot be paid");
        }
    }
}
```

领域对象不应该只是数据容器，它应该拥有行为和规则。

## 实际项目中怎么选

| 场景                        | 推荐放置位置                                   |
| ------------------------- | ---------------------------------------- |
| HTTP Controller           | `order-application`                      |
| Request / Response DTO    | `order-application`                      |
| Command / Query DTO       | `order-application-service`              |
| 用例编排                      | `order-application-service`              |
| 事务边界                      | `order-application-service`              |
| 输入端口                      | `order-application-service/ports/input`  |
| 输出端口                      | `order-application-service/ports/output` |
| 聚合根、实体、值对象                | `order-domain-core`                      |
| 领域规则                      | `order-domain-core`                      |
| 领域事件                      | `order-domain-core`                      |
| JPA Entity                | `order-dataaccess`                       |
| Spring Data JpaRepository | `order-dataaccess`                       |
| Repository Adapter        | `order-dataaccess`                       |
| MQ Consumer               | `order-messaging`                        |
| MQ Publisher              | `order-messaging`                        |
| Spring Boot 启动类           | `order-container`                        |
| Bean 装配配置                 | `order-container`                        |

写代码时，不要先问：

```text
这个代码应该放在哪个 Service？
```

更应该问：

```text
这个规则是谁的职责？
```

比如：

```text
订单只能从 PENDING 变成 PAID
```

这是订单自身的规则，应该放在 `Order` 聚合里。

所以应该写：

```java
order.pay();
```

而不是：

```java
if (order.getStatus() == OrderStatus.PENDING) {
    order.setStatus(OrderStatus.PAID);
}
```

再比如：

```text
支付完成后，需要推动餐厅审核
```

这不是 `Order` 自己的职责，因为它涉及跨系统流程编排。

它应该放在：

```text
OrderPaymentSaga
OrderPaymentResponseHandler
Application Service
```

再比如：

```text
怎么把 Order 保存到 PostgreSQL
```

这不是领域层职责，应该放在：

```text
order-dataaccess
```

再比如：

```text
怎么把 OrderPaidEvent 发到 RabbitMQ
```

这也不是领域层职责，应该放在：

```text
order-messaging
```

## 总结

六边形架构不是为了把项目拆得更复杂，而是为了让复杂业务有清晰边界。

简单记住：

* `order-domain-core` 负责业务对象和业务规则
* `order-application-service` 负责用例编排、事务和端口定义
* `order-application` 负责 HTTP 输入适配
* `order-dataaccess` 负责数据库输出适配
* `order-messaging` 负责消息输入和消息输出适配
* `order-container` 负责启动和装配

再浓缩一点：

```text
domain-core 负责“业务是什么”
application-service 负责“这个用例怎么编排”
application、dataaccess、messaging 负责“外部怎么进来、怎么出去”
container 负责“把它们装起来”
```

当这些边界守住之后，系统会有几个明显好处：

* 业务规则更集中
* 领域模型更干净
* 技术细节更容易替换
* 测试更容易写
* 模块之间不容易乱依赖
* Service 不容易变成上帝类

对于复杂订单系统、支付系统、任务编排系统、消息驱动系统来说，这种结构会比传统三层架构更适合长期演进。
