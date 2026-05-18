---
title: Spring Boot 中优雅构建 URI：别再手动拼接 URL
author: 三文鱼烤翅
pubDatetime: 2026-05-05T10:34:00+08:00
slug: spring-boot-uri-components-builder
featured: false
draft: false
tags:
 - Java
 - Spring Boot
 - Spring MVC
 - URI
description: "整理 Spring Boot 中 URI 构建工具的常见用法，说明如何避免手动拼接 URL 带来的路径、参数和编码问题。"

---

## 背景

在 Spring Boot 项目中，我们经常需要构建 URL。

比如对象存储访问地址、第三方接口地址、回调地址、分页链接、重定向地址等，很多代码一开始都会直接使用字符串拼接：

```java
String url = "https://" + bucket + ".cos." + region + ".myqcloud.com" + output.getPath();
```

这种写法看起来很简单，但在真实项目里很容易出问题。

尤其是路径、查询参数、中文、空格、`+`、`&` 等特殊字符混在一起时，手动拼接 URL 的代码会越来越难维护。

所以这篇文章整理一下 Spring Boot 中更推荐的 URI 构建方式。

## 问题

手动拼接 URL 的问题主要有几个：

* 路径分隔符 `/` 容易混乱
* 查询参数需要自己处理编码
* 中文、空格、`+`、`&` 等特殊字符容易出错
* host、path、query 参数耦合在一起
* 后续增加参数时容易改坏原有逻辑
* URL 构建逻辑散落在业务代码中，不方便统一维护

比如下面这种写法：

```java
String url = "https://" + bucket + ".cos." + region + ".myqcloud.com" + output.getPath();
```

如果 `output.getPath()` 有时带 `/`，有时不带 `/`，就很容易出现路径异常。

如果后续还要拼接查询参数：

```java
String url = "https://" + bucket + ".cos." + region + ".myqcloud.com"
    + output.getPath()
    + "?filename=" + filename;
```

那么 `filename` 里一旦出现空格、中文或特殊字符，就需要额外处理编码问题。

这类问题不一定每次都会暴露，但一旦出现在文件访问、第三方回调、签名 URL 等场景里，排查成本会比较高。

## 推荐方案

Spring 提供了 `UriComponentsBuilder`，可以用来构建 URI、处理路径变量、查询参数和编码问题。

它相比字符串拼接的优势是：

* URL 结构更清晰
* path 和 query 参数职责分离
* 参数编码更规范
* 支持 URI 模板变量
* 更适合在 Spring MVC、RestTemplate、WebClient 中统一使用

简单来说，URL 不应该只当作普通字符串来拼。

更推荐把它拆成：

* scheme：协议，比如 `https`
* host：主机名，比如 `example.com`
* path：路径，比如 `/search`
* query param：查询参数，比如 `q=Spring Boot`

这样代码表达的就是 URL 结构本身，而不是一堆字符串片段。

## 基本用法

最基本的用法如下：

```java
String url = UriComponentsBuilder.newInstance()
    .scheme("https")
    .host("example.com")
    .path("/search")
    .queryParam("q", "Spring Boot")
    .encode()
    .build()
    .toUriString();
```

生成结果：

```text
https://example.com/search?q=Spring%20Boot
```

这段代码里：

* `.scheme()` 设置协议
* `.host()` 设置域名
* `.path()` 设置路径
* `.queryParam()` 设置查询参数
* `.encode()` 处理编码
* `.toUriString()` 输出字符串形式的 URL

相比手动拼接，这种写法更清楚地表达了 URL 的组成部分。

## 核心用法

### 构建带路径变量的 URL

如果 URL 中存在路径变量，可以使用 URI 模板：

```java
String url = UriComponentsBuilder
    .fromUriString("https://example.com/hotels/{hotel}")
    .queryParam("q", "{keyword}")
    .encode()
    .buildAndExpand("search", "速八酒店")
    .toUriString();
```

生成结果：

```text
https://example.com/hotels/search?q=%E9%80%9F%E5%85%AB%E9%85%92%E5%BA%97
```

这里 `{hotel}` 和 `{keyword}` 是 URI 模板变量。

这种方式适合路径参数和查询参数都需要动态传入的场景。

### 使用 URI 模板简化构建

也可以直接在 URI 字符串里写完整模板：

```java
URI uri = UriComponentsBuilder
    .fromUriString("https://example.com/hotels/{hotel}?q={keyword}")
    .build("search", "速八酒店");
```

这种写法更短，但在参数较多时，可读性不如 `.queryParam()` 清晰。

如果查询参数较多，还是更推荐显式使用 `.queryParam()`。

### 添加查询参数

查询参数应该使用 `.queryParam()`，不要自己拼 `?` 和 `&`：

```java
String url = UriComponentsBuilder
    .fromUriString("https://example.com/search")
    .queryParam("q", "Spring Boot")
    .queryParam("page", 1)
    .queryParam("size", 20)
    .encode()
    .build()
    .toUriString();
```

生成结果：

```text
https://example.com/search?q=Spring%20Boot&page=1&size=20
```

这样做的好处是，参数之间的连接关系由工具处理，不需要自己判断什么时候用 `?`，什么时候用 `&`。

### 处理编码问题

编码是手动拼接 URL 时最容易出错的地方。

比如：

```java
URI uri = UriComponentsBuilder
    .fromPath("/hotel list/{city}")
    .queryParam("q", "{keyword}")
    .encode()
    .buildAndExpand("wlmq", "200+double bed")
    .toUri();
```

生成结果：

```text
/hotel%20list/wlmq?q=200%2Bdouble%20bed
```

这里有几个细节：

* 路径中的空格会被编码成 `%20`
* 查询参数中的 `+` 会被编码成 `%2B`
* 查询参数中的空格会被编码成 `%20`

如果手动拼接，这些字符很容易被错误处理。

### 配置 RestTemplate 的 URI 构建规则

如果项目里使用 `RestTemplate`，可以通过 `DefaultUriBuilderFactory` 统一配置基础 URL 和编码模式：

```java
DefaultUriBuilderFactory factory = new DefaultUriBuilderFactory("https://example.com");
factory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.TEMPLATE_AND_VALUES);

RestTemplate restTemplate = new RestTemplate();
restTemplate.setUriTemplateHandler(factory);

String result = restTemplate.getForObject(
    "/search?q={keyword}",
    String.class,
    "Spring Boot 实战"
);
```

这样后续调用接口时，可以基于统一的基础地址构建请求 URL。

适合内部服务调用、第三方 API Client 封装等场景。

### 配置 WebClient 的 URI 构建规则

如果使用 `WebClient`，也可以配置 `DefaultUriBuilderFactory`：

```java
DefaultUriBuilderFactory factory = new DefaultUriBuilderFactory("https://example.com");
factory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.TEMPLATE_AND_VALUES);

WebClient webClient = WebClient.builder()
    .uriBuilderFactory(factory)
    .build();
```

这样 `WebClient` 发起请求时，也可以复用统一的 URI 构建规则。

### 基于当前请求构建 URI

在 Spring MVC 中，可以使用 `ServletUriComponentsBuilder` 基于当前请求构建 URI：

```java
@GetMapping("/current")
public String current(HttpServletRequest request) {
    URI uri = ServletUriComponentsBuilder
        .fromRequest(request)
        .replaceQueryParam("id", "{id}")
        .build(666);

    return uri.toString();
}
```

这个方式适合需要根据当前请求生成链接的场景，比如：

* 返回当前资源链接
* 构建分页链接
* 构建重定向地址
* 替换或追加查询参数

### 基于当前上下文路径构建 URI

如果只想基于当前应用上下文构建地址，可以这样写：

```java
URI uri = ServletUriComponentsBuilder
    .fromContextPath(request)
    .path("/users")
    .build()
    .toUri();
```

这适合生成站内资源链接。

### 基于 Controller 方法构建链接

Spring MVC 还提供了 `MvcUriComponentsBuilder`，可以基于 Controller 方法生成链接：

```java
@RestController
@RequestMapping("/books")
public class BookController {

    @GetMapping("/{id}")
    public Book getBook(@PathVariable Long id) {
        return new Book(id);
    }
}
```

然后通过方法名构建 URI：

```java
URI uri = MvcUriComponentsBuilder
    .fromMethodName(BookController.class, "getBook", 666L)
    .build()
    .encode()
    .toUri();
```

这种方式的好处是，链接和 Controller 方法绑定。

如果请求路径发生调整，代码更容易跟着重构，而不是到处搜索字符串路径。

不过在真实项目中，这种写法不要滥用。一般只有在需要生成资源链接、HATEOAS 风格链接或内部跳转链接时才考虑使用。

## 项目中怎么落地

在真实项目中，不建议把 URL 构建逻辑散落在 Controller 或 Service 中。

如果是第三方接口 URL，可以封装到独立的 Client 中。

如果是对象存储访问 URL，可以封装到专门的 URL Factory 中。

比如对象存储 URL 构建：

```java
@Component
public class CosUrlFactory {

    public String buildObjectUrl(String bucket, String region, String path) {
        return UriComponentsBuilder.newInstance()
            .scheme("https")
            .host(bucket + ".cos." + region + ".myqcloud.com")
            .path(path)
            .encode()
            .build()
            .toUriString();
    }
}
```

业务代码只需要这样调用：

```java
String url = cosUrlFactory.buildObjectUrl(
    bucket,
    region,
    output.getPath()
);
```

这样做有几个好处：

* 业务层不用关心 URL 拼接细节
* 对象存储域名规则集中维护
* 后续切换 CDN 域名更方便
* 编码规则可以统一处理
* 单元测试更容易写

如果是第三方 API，也可以封装为 Client：

```java
@Component
@RequiredArgsConstructor
public class SearchApiClient {

    private final RestTemplate restTemplate;

    public String search(String keyword) {
        return restTemplate.getForObject(
            "/search?q={keyword}",
            String.class,
            keyword
        );
    }
}
```

并在配置类中统一设置基础 URL：

```java
@Bean
public RestTemplate restTemplate() {
    DefaultUriBuilderFactory factory = new DefaultUriBuilderFactory("https://example.com");
    factory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.TEMPLATE_AND_VALUES);

    RestTemplate restTemplate = new RestTemplate();
    restTemplate.setUriTemplateHandler(factory);
    return restTemplate;
}
```

这样第三方接口的基础地址、编码模式和请求路径就不会散落在业务代码里。

## 不推荐写法和推荐写法

不推荐：

```java
String url = "https://" + bucket + ".cos." + region + ".myqcloud.com" + output.getPath();
```

推荐：

```java
String url = UriComponentsBuilder.newInstance()
    .scheme("https")
    .host(bucket + ".cos." + region + ".myqcloud.com")
    .path(output.getPath())
    .encode()
    .build()
    .toUriString();
```

推荐写法的好处是：

* host 和 path 分离
* URL 结构更清晰
* 特殊字符可以统一编码
* 后续扩展查询参数更方便
* 不需要手动处理 `?`、`&`、`/` 等连接细节

如果后续要增加查询参数，推荐写法可以自然扩展：

```java
String url = UriComponentsBuilder.newInstance()
    .scheme("https")
    .host(bucket + ".cos." + region + ".myqcloud.com")
    .path(output.getPath())
    .queryParam("filename", filename)
    .encode()
    .build()
    .toUriString();
```

而字符串拼接写法会越来越乱。

## 实际项目中怎么选

| 场景                   | 推荐方式                                                   |
| -------------------- | ------------------------------------------------------ |
| 普通 URL 构建            | `UriComponentsBuilder`                                 |
| 带查询参数                | `.queryParam()`                                        |
| 带路径变量                | URI 模板 + `.buildAndExpand()`                           |
| 需要统一基础 URL           | `DefaultUriBuilderFactory`                             |
| `RestTemplate` 请求    | `DefaultUriBuilderFactory` + `setUriTemplateHandler()` |
| `WebClient` 请求       | `DefaultUriBuilderFactory` + `uriBuilderFactory()`     |
| 基于当前请求生成链接           | `ServletUriComponentsBuilder`                          |
| 基于 Controller 方法生成链接 | `MvcUriComponentsBuilder`                              |
| 对象存储访问地址             | 封装 URL Factory                                         |
| 第三方 API 地址           | 封装 API Client                                          |

一般项目里最常用的是：

* `UriComponentsBuilder`
* `DefaultUriBuilderFactory`
* `ServletUriComponentsBuilder`

`MvcUriComponentsBuilder` 更适合需要根据 Controller 方法生成链接的特殊场景，不一定每个项目都需要。

## 总结

在 Spring Boot 项目中，不建议直接使用字符串拼接 URL。

更推荐使用 Spring 提供的 URI 构建工具完成路径构建、参数拼接和编码处理。

简单记住：

* 拼基础 URL：用 `UriComponentsBuilder`
* 拼路径：用 `.path()`
* 拼查询参数：用 `.queryParam()`
* 处理变量：用 URI 模板
* 统一客户端基础 URL：用 `DefaultUriBuilderFactory`
* 基于当前请求生成链接：用 `ServletUriComponentsBuilder`
* 基于 Controller 方法生成链接：用 `MvcUriComponentsBuilder`

URL 构建看起来是小问题，但它经常出现在对象存储、第三方 API、回调地址、分页链接和重定向场景里。

把它从字符串拼接改成标准 URI 构建工具，代码会更安全，也更容易维护。

整理依据：技术博客整理 Skill 与原始文章素材。 
