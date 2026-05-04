---
title: 从传统三层到六边形架构：以 order-service 为例拆解模块职责与调用边界
author: sanwenyukaochi
pubDatetime: 2026-05-04T12:30:00.000+00:00
slug: hexagonal-architecture-order-service-module-boundary
featured: true
draft: false
tags:
  - DDD
  - Hexagonal Architecture
  - Clean Architecture
  - Spring Boot
  - Java
  - Backend
description: "以 order-service 为例，系统拆解六边形架构中的 application、domain-core、application-service、dataaccess、messaging、container 等模块职责、依赖关系和调用边界。"
timezone: "Asia/Shanghai"
---

---

# 从传统三层到六边形架构：以 order-service 为例拆解模块职责与调用边界

在 Java 后端项目中，很多人一开始都会使用传统三层架构：

```text
Controller -> Service -> Repository
```

这种结构简单直接，适合小型项目。但随着业务越来越复杂，尤其是涉及订单、支付、消息、状态流转、领域规则、外部系统集成时，传统三层架构很容易出现几个问题：

```text
Controller 越来越重
Service 越来越臃肿
Repository 被到处调用
业务规则散落在各个地方
领域对象只剩 getter/setter
```

这时，引入六边形架构，也就是 Ports and Adapters Architecture，可以更好地控制模块边界，让业务核心保持稳定，让技术细节可替换、可维护、可测试。

本文以如下 order-service 模块结构为例，说明六边形架构中各模块的职责、依赖关系和调用链。

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

---

# 一、这个结构不是传统三层架构

很多人看到这些模块，容易把它理解成：

```text
Controller -> Service -> Repository
```

但这个结构本质上不是传统三层，而是六边形架构。

六边形架构的核心思想是：

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

也就是说，业务核心不应该直接依赖数据库、消息队列、HTTP、第三方接口这些技术细节。

真正的依赖方向应该是：

```text
外层依赖内层
内层不依赖外层
```

---

# 二、整体模块职责

## 1. order-container：启动装配层

`order-container` 是整个服务的启动模块，也可以理解为 Composition Root。

它负责：

```text
Spring Boot 启动类
Bean 扫描
模块装配
配置文件加载
启动整个 order-service
```

典型内容包括：

```text
OrderServiceApplication.java
BeanConfiguration.java
application.properties
```

它可以依赖其他所有模块，因为它的职责就是把系统组装起来。

但是要注意：

```text
order-container 不应该写业务代码
```

它只负责启动和装配，不负责订单规则、支付规则、消息处理逻辑。

---

## 2. order-application：HTTP 输入适配器

`order-application` 是外部 HTTP 请求进入系统的入口。

它负责：

```text
Controller
REST Request DTO
参数校验
把 HTTP 请求转换成 Command
调用 input port
返回 Response
```

例如：

```java
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderApplicationService;

    @PostMapping("/orders")
    public CreateOrderResponse createOrder(@RequestBody CreateOrderRequest request) {
        return orderApplicationService.createOrder(
            CreateOrderCommand.from(request)
        );
    }
}
```

这里最关键的一点是：

```text
Controller 只调用 Application Service 的 input port
```

它不应该直接调用：

```text
JPA Repository
RabbitTemplate
KafkaTemplate
数据库 Mapper
消息 Publisher
领域对象复杂逻辑
```

否则 HTTP 层就会侵入业务层，后期维护会非常困难。

---

## 3. order-domain-core：纯领域核心

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

严格来说，`order-domain-core` 最好是一个纯 Java 模块。

它只关心业务，不关心技术实现。

比如订单支付这件事，不应该写成：

```java
order.setOrderStatus(OrderStatus.PAID);
```

而应该写成：

```java
order.pay();
```

领域对象自己保护自己的状态：

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

这样做的好处是：

```text
订单状态规则集中在 Order 聚合内部
不会散落在 Controller、Service、MQ Listener 中
不会变成贫血模型
```

---

## 4. order-application-service：用例编排层

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

例如：

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

真正的业务流程编排可以放在 Handler 中：

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

需要注意的是，这里的：

```java
private final OrderRepository orderRepository;
```

不是 Spring Data JPA 的 Repository。

它应该是应用层定义的输出端口：

```text
ports.output.repository.OrderRepository
```

真正的 JPA 实现应该放在 `order-dataaccess` 里。

---

## 5. order-dataaccess：数据库输出适配器

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

它实现 application-service 中定义的 output port：

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

不是应用层依赖数据库，而是数据库适配器依赖应用层定义的接口。

---

## 6. order-messaging：消息输入/输出适配器

`order-messaging` 负责消息相关的技术实现。

它有两类职责。

第一类是消费消息，也就是输入适配器：

```text
PaymentResponseMessageListener
RestaurantApprovalResponseMessageListener
```

例如支付服务发回支付成功消息，MQ Listener 收到后，不应该直接改数据库，而应该调用 application-service 的 input port。

错误方式：

```java
public void paymentCompleted(PaymentResponse response) {
    OrderEntity order = orderJpaRepository.findById(...);
    order.setStatus(PAID);
    orderJpaRepository.save(order);
}
```

正确方式：

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

它们实现 application-service 中定义的 publisher port。

例如：

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

---

# 三、模块依赖关系应该怎么设计

推荐依赖方向如下：

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

画成图大概是：

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

最重要的原则是：

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

---

# 四、一次创建订单的完整调用链

假设用户调用：

```text
POST /orders
```

完整调用链应该是：

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
    Kafka/RabbitMQ Publisher 发送 PaymentRequest

11. order-application
    返回 CreateOrderResponse
```

这条链路中有几个非常重要的边界：

```text
Controller 不知道 JPA
Application Service 不知道 KafkaTemplate
Domain Core 不知道 Spring
DataAccess 不知道 Controller
Messaging 不直接操作数据库状态
```

这就是六边形架构真正想解决的问题。

---

# 五、支付成功消息的完整调用链

假设 payment-service 发回支付成功消息：

```text
PaymentResponse
```

调用链应该是：

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

这样订单状态规则就不会散落到消息层。

---

# 六、Port 和 Adapter 在项目里的映射

## 1. 输入端口 Port In

输入端口放在：

```text
order-application-service/ports/input
```

例如：

```java
public interface OrderApplicationService {
    CreateOrderResponse createOrder(CreateOrderCommand command);
    TrackOrderResponse trackOrder(TrackOrderQuery query);
}
```

也可以有消息输入端口：

```java
public interface PaymentResponseMessageListener {
    void paymentCompleted(PaymentResponse response);
    void paymentCancelled(PaymentResponse response);
}
```

它们表示：

```text
外部世界可以通过哪些方式驱动订单领域
```

---

## 2. 输入适配器 Adapter In

输入适配器通常放在：

```text
order-application
order-messaging
```

HTTP Controller 是输入适配器：

```java
@RestController
public class OrderController {
    private final OrderApplicationService orderApplicationService;
}
```

MQ Consumer 也是输入适配器：

```java
@Component
public class PaymentResponseKafkaListener {
    private final PaymentResponseMessageListener paymentResponseMessageListener;
}
```

它们都负责把外部请求转换成应用层可以理解的输入。

---

## 3. 输出端口 Port Out

输出端口放在：

```text
order-application-service/ports/output
```

例如：

```java
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(OrderId orderId);
}
```

以及：

```java
public interface OrderCreatedPaymentRequestMessagePublisher {
    void publish(OrderCreatedEvent event);
}
```

它们表示：

```text
应用层需要外部世界帮它做什么
```

比如：

```text
保存订单
查询客户
查询餐厅
发送支付请求
发送餐厅审核请求
```

---

## 4. 输出适配器 Adapter Out

输出适配器放在：

```text
order-dataaccess
order-messaging
```

数据库适配器：

```java
@Component
public class OrderRepositoryImpl implements OrderRepository {
}
```

消息发布适配器：

```java
@Component
public class OrderCreatedPaymentRequestKafkaPublisher
        implements OrderCreatedPaymentRequestMessagePublisher {
}
```

它们负责把应用层定义的接口变成真实技术实现。

---

# 七、最容易写错的几个地方

## 错误一：Controller 直接调用 Repository

错误写法：

```java
@RestController
public class OrderController {

    private final OrderJpaRepository orderJpaRepository;
}
```

正确写法：

```java
@RestController
public class OrderController {

    private final OrderApplicationService orderApplicationService;
}
```

Controller 不应该知道数据库怎么查，也不应该知道订单怎么保存。

---

## 错误二：Application Service 直接依赖 JpaRepository

错误写法：

```java
@Service
public class OrderApplicationServiceImpl {

    private final OrderJpaRepository orderJpaRepository;
}
```

正确写法：

```java
@Service
public class OrderApplicationServiceImpl {

    private final OrderRepository orderRepository;
}
```

其中 `OrderRepository` 是 application-service 定义的 output port。

---

## 错误三：Domain Core 里出现 JPA 注解

如果走严格 DDD / 六边形架构，不建议这样写：

```java
@Entity
@Table(name = "orders")
public class Order {
}
```

更推荐分开：

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

---

## 错误四：MQ Listener 直接改状态

错误写法：

```java
public void paymentCompleted(PaymentResponse response) {
    OrderEntity order = orderJpaRepository.findById(...);
    order.setStatus(PAID);
    orderJpaRepository.save(order);
}
```

正确写法：

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

---

## 错误五：领域对象只有 getter/setter

错误写法：

```java
@Getter
@Setter
public class Order {
    private OrderStatus orderStatus;
}
```

这就是典型贫血模型。

更好的写法是：

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

也就是说，领域对象不只是数据容器，它应该拥有行为和规则。

---

# 八、如何判断代码应该放在哪一层？

写代码时，不要先问：

```text
这个代码应该放在哪个 Service？
```

而应该问：

```text
这个规则是谁的职责？
```

比如：

```text
订单只能从 PENDING 变成 PAID
```

这是订单自身的规则，应该放在：

```text
Order 聚合
```

所以应该写：

```java
order.pay();
```

而不是：

```java
if (order.getStatus() == PENDING) {
    order.setStatus(PAID);
}
```

再比如：

```text
支付完成后，需要推动餐厅审核
```

这不是 Order 自己的职责，因为它涉及跨系统流程编排。

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

这不是领域层职责。

它应该放在：

```text
order-dataaccess
```

再比如：

```text
怎么把 OrderPaidEvent 发到 RabbitMQ
```

这也不是领域层职责。

它应该放在：

```text
order-messaging
```

---

# 九、一句话总结每个模块

```text
order-application
    负责接 HTTP 请求，不负责业务规则。

order-container
    负责启动和装配，不负责业务规则。

order-dataaccess
    负责数据库技术实现，不负责业务规则。

order-domain-core
    负责真正的业务对象和业务规则。

order-application-service
    负责用例编排、事务、调用领域对象、定义端口。

order-messaging
    负责消息收发，不负责业务规则。
```

---

# 十、最终心法

六边形架构不是为了把项目拆得更复杂，而是为了让复杂业务有清晰边界。

最核心的一句话是：

```text
domain-core 负责“业务是什么”；
application-service 负责“这个用例怎么编排”；
application、dataaccess、messaging 负责“外部怎么进来、怎么出去”；
container 负责“把它们装起来”。
```

当你坚持这个边界之后，系统会有几个明显好处：

```text
业务规则更集中
领域模型更干净
技术细节更容易替换
测试更容易写
模块之间不容易乱依赖
Service 不容易变成上帝类
```

对于复杂订单系统、支付系统、任务编排系统、消息驱动系统来说，这种结构会比传统三层架构更适合长期演进。
