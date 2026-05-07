---
title: Docker容器化与K8s自动化部署 - CI/CD流水线
outline: deep
---

# Docker容器化与K8s自动化部署 - CI/CD流水线

## 重难点6：基于Docker容器化改造项目，通过GitLab CI/CD构建自动化流水线，配合Kubernetes实现一键部署与弹性伸缩

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：手动部署慢且环境不一致 → Docker封装镜像 → GitLab CI自动化流水线 → K8s编排弹性伸缩 → 灰度发布与快速回滚</div>
  <ul>
    <li><strong>容器化：</strong>Docker多阶段构建，镜像统一环境，版本化管理</li>
    <li><strong>CI/CD：</strong>GitLab CI四阶段（测试→构建→镜像推送→部署），测试环境自动，生产需审批</li>
    <li><strong>K8s：</strong>Deployment滚动更新，Service负载均衡，Ingress入口，HPA自动扩缩</li>
    <li><strong>效果：</strong>部署时间半天→10分钟，成功率70%→95%，回滚1分钟，支持灰度</li>
  </ul>
  <div class="one-liner">📌 一句话总结：容器化实现环境统一，自动化流水线将部署从半天降到10分钟，K8s提供弹性与快速回滚能力。</div>
</div>

### 问题1：为什么要做容器化？Docker解决了什么问题？ {#q6-1}

<div class="original-text">
传统部署方式是直接在服务器上跑Node服务，但有几个痛点：环境不一致，本地Node版本、依赖版本和服务器不一样，经常本地能跑线上挂；部署繁琐，要手动打包、上传、安装依赖、重启服务；回滚困难，出问题不知道回到哪个版本。

主要三个问题：环境差异导致的"在我机器上能跑"问题；手动部署容易出错且效率低；版本管理混乱，回滚困难。

业界标准方案就是容器化，Docker把应用和环境打包成镜像，保证环境一致。镜像有版本标签，方便管理和回滚。Kubernetes做容器编排，管理大规模容器部署。

我做了三步：

**第一步写Dockerfile**，定义镜像构建过程。前端镜像基于Nginx，把构建产物复制进去；后端镜像基于Node，复制代码和依赖，暴露端口。

**第二步多阶段构建优化镜像大小**。构建阶段安装所有依赖、编译代码，运行阶段只保留必要文件，镜像从800MB降到200MB。

**第三步搭建私有镜像仓库**，存储和管理镜像。每次构建打上版本标签，方便追溯和回滚。

环境一致性问题彻底解决，本地、测试、生产用同一个镜像；部署简化成pull镜像、run容器两步；回滚变成切换镜像版本，1分钟搞定；镜像可以复用，新项目直接基于已有镜像改。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>解决：</strong>环境不一致、手动部署慢、回滚难</li>
    <li><strong>做法：</strong>Dockerfile多阶段构建（800MB→200MB），私有镜像仓库，版本标签</li>
    <li><strong>收益：</strong>环境统一，部署简化，回滚1分钟</li>
  </ul>
</div>

### 问题2：CI/CD流水线是怎么设计的？如何保证自动化？ {#q6-2}

<div class="original-text">
之前部署流程全是手动：开发改完代码通知运维，运维手动拉代码、打包、上传、部署。一次发版要协调多个人，至少半天，而且容易出错，比如忘了装某个依赖、配置文件没更新。

问题在于：流程依赖人工，效率低；多人协作沟通成本高；手动操作容易出错；没有统一标准，每个人操作不一样。

业界标准是CI/CD。CI是持续集成，代码提交自动构建和测试。CD是持续部署，测试通过自动部署到环境。工具有Jenkins、GitLab CI、GitHub Actions。

用GitLab CI设计了四阶段流水线：

**第一阶段测试**，跑单元测试和lint检查，不通过流水线终止。

**第二阶段构建**，执行npm install、npm run build，打包前端和后端代码。

**第三阶段镜像**，构建Docker镜像，打上版本标签推送到镜像仓库。版本号用Git tag或分支名加时间戳。

**第四阶段部署**，根据分支自动部署到不同环境。develop分支自动部署测试环境，master分支需要手动审批后部署生产环境。部署就是更新K8s的Deployment，滚动更新镜像版本。

完全自动化，提交代码10分钟后自动部署完成；人工介入降到最低，只需要点一次审批按钮；出错立即知道，流水线哪一步失败一目了然；标准化，所有项目都用同一套流水线，统一规范。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>四阶段：</strong>测试 → 构建 → 镜像推送 → 部署</li>
    <li><strong>自动化：</strong>develop分支自动部署测试，master需审批后生产</li>
    <li><strong>效果：</strong>提交10分钟部署，失败即时反馈，流程标准化</li>
  </ul>
</div>

### 问题3：Kubernetes的编排配置是怎么做的？ {#q6-3}

<div class="original-text">
有了Docker镜像后，要在服务器上跑起来。但手动docker run很原始，要管理端口映射、环境变量、容器重启、负载均衡，很复杂。而且要实现高可用、弹性伸缩，手动管理几乎不可能。

需要解决：容器编排，管理多个容器；服务发现和负载均衡；健康检查和自动重启；弹性伸缩；滚动更新和回滚。

Kubernetes是容器编排的事实标准。通过Deployment管理应用部署，Service做负载均衡，Ingress做流量入口，ConfigMap管理配置，HPA做自动扩缩容。

写了三类K8s资源配置：

**Deployment** 定义应用部署，指定镜像、副本数、资源限制、健康检查。配置了rollingUpdate策略，滚动更新，一个一个替换容器，不中断服务。

**Service** 做负载均衡，多个副本之间分流请求。类型用ClusterIP，集群内访问。

**Ingress** 做流量入口，配置域名和路由规则，通过域名访问服务。

还配置了ConfigMap管理配置文件，Secret管理敏感信息如数据库密码，HPA配置自动扩缩容，CPU超过70%自动加副本。

高可用，多副本部署，一个挂了其他继续服务；自动恢复，容器挂了K8s自动重启；弹性伸缩，流量高峰自动扩容，低峰自动缩容，资源利用率提升50%；滚动更新无感知，用户无感知服务升级；一键回滚，更新有问题一条命令回退到上个版本。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>核心资源：</strong>Deployment（滚动更新）、Service（ClusterIP负载均衡）、Ingress（域名路由）、HPA（CPU&gt;70%扩容）</li>
    <li><strong>配置管理：</strong>ConfigMap，Secret</li>
    <li><strong>收益：</strong>高可用，自动恢复，弹性伸缩利用率提50%，滚动更新无感知，一键回滚</li>
  </ul>
</div>

### 问题4：如何实现灰度发布和快速回滚？ {#q6-4}

<div class="original-text">
新版本上线有风险，可能有隐藏bug。如果直接全量发布，一旦出问题影响所有用户。而且出问题后回滚慢，要重新构建部署，至少半小时，这段时间服务不可用。

需要实现：灰度发布，新版本先给少量用户，验证没问题再全量；快速回滚，出问题立即回到上个稳定版本；最小化影响，降低发版风险。

灰度发布有几种方案：蓝绿部署，同时运行新旧两套环境，切换流量；金丝雀发布，新版本少量副本，逐步放量；A/B测试，不同用户路由到不同版本。工具有Istio、Nginx、K8s原生支持。

用K8s的滚动更新实现渐进式灰度：配置Deployment的maxUnavailable为1，maxSurge为1，表示每次只更新一个副本。如果有10个副本，更新时先启动1个新版本，验证健康后停掉1个旧版本，再启动下一个新版本，逐步替换。配置minReadySeconds为30秒，新容器启动后等30秒才接入流量，确保启动完全。配置livenessProbe和readinessProbe健康检查，新容器不健康自动停止更新。

回滚用kubectl rollout undo，一条命令回到上个版本，基本1分钟完成。因为镜像都在仓库里，直接切换镜像版本即可。还可以手动控制灰度比例，先部署1个新版本副本，观察1小时，没问题再全量更新。

发版风险大幅降低，新版本出问题影响面小，最多10%用户；发现问题快，健康检查失败自动停止更新；回滚快，1分钟完成，相比之前半小时提升30倍；信心提升，敢于频繁发版，迭代速度变快。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>灰度：</strong>K8s滚动更新，maxUnavailable=1逐步替换，minReadySeconds+健康检查保障</li>
    <li><strong>回滚：</strong>kubectl rollout undo，1分钟切换镜像版本</li>
    <li><strong>效果：</strong>影响面缩至10%，回滚30倍提速，敢于频繁发版</li>
  </ul>
</div>

### 问题5：如果让你重新设计这套DevOps体系，会做哪些改进？ {#q6-5}

<div class="original-text">
目前的体系能满足基本需求，但还有优化空间。比如监控告警不够完善，部署后不知道服务是否正常；多环境管理有点混乱，配置分散；日志收集不统一，排查问题要登录服务器看。

改进方向：完善监控告警体系；统一配置管理；集中日志收集；实现完整的可观测性；提升部署安全性。

监控用Prometheus + Grafana；日志用ELK (Elasticsearch + Logstash + Kibana) 或Loki；链路追踪用Jaeger；配置管理用Apollo或Nacos；安全扫描用Trivy、Sonarqube。

按优先级五个改进：

**第一完善监控告警**，集成Prometheus收集应用指标，Grafana做可视化，配置告警规则，异常时自动通知。监控QPS、响应时间、错误率、资源使用率。

**第二集中日志收集**，用Loki收集所有容器日志，统一查询和分析。不用登录服务器，在Grafana里就能看日志。

**第三统一配置管理**，用ConfigMap和Secret管理所有配置，不写死在代码里。不同环境用不同ConfigMap，一套代码多环境部署。

**第四加入安全扫描**，流水线里加镜像安全扫描，检查漏洞和敏感信息。代码提交时做代码扫描，发现安全问题。

**第五实现多集群管理**，测试、预发、生产用不同K8s集群，完全隔离，更安全。

预期效果：监控告警让问题能及时发现和处理；集中日志让排查问题更快；统一配置让环境管理更规范；安全扫描降低安全风险；多集群隔离更安全可靠。这些改进能让DevOps体系从"能用"变成"好用"，从满足基本需求到提供完整的研发效能支撑。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>改进优先级：</strong>监控告警(Prometheus+Grafana) > 集中日志(Loki) > 统一配置(Apollo) > 安全扫描(Trivy) > 多集群隔离</li>
    <li><strong>监控：</strong>QPS/延迟/错误率告警</li>
    <li><strong>日志：</strong>Loki聚合，Grafana统一查看</li>
    <li><strong>配置：</strong>ConfigMap/Secret环境隔离</li>
    <li><strong>安全：</strong>镜像+代码扫描</li>
    <li><strong>多集群：</strong>环境物理隔离，提升安全性</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— Docker & K8s DevOps · 面试笔记 ——</p>
