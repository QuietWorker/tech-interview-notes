---
title: 文件上传组件 - 类型校验与断点续传
outline: deep
---

# 文件上传组件 - 类型校验与断点续传

## 重难点8：文件上传组件 - 多级校验与断点续传方案

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：el-upload 基础封装，beforeUpload 前置校验，image-conversion 图片压缩，wlBatchUpload 批量提交，SparkMD5 分片哈希，并发队列控制断点续传</div>
  <ul>
    <li><strong>组件体系：</strong>wl_tabcol_upload（表格列上传）、wl_input_upload（输入框上传）、wl_img_upload（图片专用）</li>
    <li><strong>校验机制：</strong>文件扩展名白名单 + Config.sizeMax 全局大小限制（默认10MB）</li>
    <li><strong>图片优化：</strong>Canvas 压缩签名图片至45px高度，image-conversion 库自动压缩大图</li>
    <li><strong>批量上传：</strong>FormData 多文件并行，ajaxQueue 队列管理，防抖避免重复提交</li>
    <li><strong>效果数据：</strong>扫码枪毫秒级响应，批量入库效率提升 60%，杜绝不相容化学品混放风险</li>
  </ul>
  <div class="one-liner">📌 一句话总结：基于 Element UI el-upload 构建三层上传组件体系，通过前置校验、图片压缩、批量队列实现高效文件管理，并提供完整的断点续传业界方案。</div>
</div>

### 问题1：上传组件支持哪些功能？ {#q8-1}

<div class="original-text">
项目中实现了三种不同场景的上传组件，分别服务于表格行内上传、表单输入框上传和图片专用上传。

主要功能包括：

1. 基础上传：单文件/多文件选择，自动上传或手动触发
2. 类型限制：通过 filetypes 数组配置允许的文件扩展名（如 ['jpg', 'png']）
3. 大小限制：基于 Config.sizeMax 全局配置（默认10MB），支持自定义 customSizeMax
4. 文件列表：标签式展示已选文件，支持删除和下载
5. 图片压缩：电子签名场景下自动压缩图片尺寸，通用场景使用 image-conversion 库
6. 额外参数：支持传递 type、owner、remark 等业务字段到后端
7. 禁用状态：compDisabled 控制上传按钮和下载按钮的可用性

这些组件都继承自 WlCompValidateBase，统一了校验逻辑和状态管理。

</div>

```vue
<!-- wl_tabcol_upload.vue - 表格列上传组件 -->
<template>
  <div class="tabcol-upload">
    <wl-tooltip
      v-if="dataCopy[fieldCopy][subFields[0]]"
      overflow
      effect="dark"
      :content="dataCopy[fieldCopy][subFields[0]]"
      placement="top"
    >
      <div class="upload_name">{{ dataCopy[fieldCopy][subFields[0]] }}</div>
    </wl-tooltip>
    <el-upload
      :data="uploadCof.data"
      :accept="uploadAccept"
      :action="uploadCof.uploadUrl"
      :multiple="false"
      :on-success="afterSuccess"
      :show-file-list="false"
      with-credentials
      :before-upload="beforeUpload"
    >
      <el-button
        size="mini"
        type="primary"
      >
        选择文件
      </el-button>
    </el-upload>
  </div>
</template>
```

```ts
// wl_input_upload.ts - 输入框上传组件核心配置
@Prop({ type: Boolean, default: false })
readonly isMulti: boolean; // 是否多选

@Prop({ type: String, default: "/upload/uploadFile" })
readonly upLoadUrl: any; // 上传接口地址

@Prop({ type: Number, default: 5 })
readonly limit: String; // 最大上传数量

@Prop({ type: Boolean, default: false })
readonly needZipImg: boolean; // 是否需要压缩图片

@Prop({ type: Number, default: 0})
readonly customSizeMax: number; // 自定义文件大小限制
```

<div class="memory-aid">
  <ul>
    <li><strong>三类组件：</strong>wl_tabcol_upload（表格）、wl_input_upload（表单）、wl_img_upload（图片）</li>
    <li><strong>核心能力：</strong>类型/大小校验、图片压缩、批量上传、文件列表管理</li>
    <li><strong>统一基类：</strong>继承 WlCompValidateBase，保证校验逻辑一致性</li>
  </ul>
</div>

### 问题2：文件类型校验和大小限制怎么做的？ {#q8-2}

<div class="original-text">
文件校验在 beforeUpload 钩子中完成，这是 el-upload 提供的上传前拦截机制。

实现细节：

1. 类型校验：提取文件扩展名并转为小写，与 uploadCof.filetypes 白名单比对。如果不匹配，调用 WLErrorMessage 提示并返回 false 阻止上传。
2. 大小校验：使用 file.size 与 Config.sizeMax _ 1024 _ 1024 比较。Config.sizeMax 在 static/config/config.js 中定义为 10（单位MB）。
3. 图片特殊处理：wl_img_upload 中增加了 image-conversion 库的 compressAccurately 方法，当文件超过限制时自动压缩到指定大小（单位KB）。
4. 签名图片压缩：wl_input_upload 的 beforeAvatarUpload 中，针对 needZipImg 场景，使用 Canvas 将图片高度压缩至45px，保持宽高比。

这种设计将校验逻辑前置，避免了无效文件上传到服务器，节省了带宽和存储空间。

</div>

```ts
// wl_tabcol_upload.ts - 文件类型和大小校验
beforeUpload(file: any) {
  // 1. 提取文件扩展名
  const nameFix = file.name.substr(file.name.lastIndexOf(".") + 1);
  let filetypes: any = this.uploadCof.filetypes;
  let filetype: any = nameFix ? nameFix.toLowerCase() : ''

  // 2. 类型白名单校验
  if (wllib.detect.wlIsNotNullArray(filetypes) && !filetypes.includes(filetype)) {
    let tips: any = `只能上传${this.filetypes.join("、")}格式的文件`;
    wllib.global.WLErrorMessage(tips);
    return false; // 返回 false 阻止上传
  }

  // 3. 大小限制校验（Config.sizeMax 默认为 10MB）
  const isLimit = file.size < Config.sizeMax * 1024 * 1024;
  if (!isLimit) {
    let msg: any = `上传的附件不能超过${Config.sizeMax}M`
    wllib.global.WLWarnMessage(msg);
    return false
  }
  return isLimit;
}
```

```ts
// wl_img_upload.ts - 图片自动压缩逻辑
compressImage(file: any) {
  return new Promise((resolve, reject) => {
    console.log("压缩前", file, 'compressImage--daxiao', this.uploadFileSizeM, this.LimitFileSizeM)

    // 判断是否需要压缩
    if (file.size > this.LimitFileSizeM * 1024 * 1024) {
      // 使用 image-conversion 库进行精确压缩
      imageConversion.compressAccurately(file.raw, {
        size: this.LimitFileSizeM * 1024, // 压缩后图像的尺寸，单位Kb
        accuracy: 0.9,    // 图像压缩精度0.8-0.99，默认0.95
      }).then((res: any) => {
        let resFile: any = new File([res], file.name, {
          type: res.type,
          lastModified: Date.now()
        });
        file.raw = resFile;
        file.size = res.size;
        resolve(file)
      }, (err: any) => {
        console.log("压缩失败", err);
        reject(file);
      })
    } else {
      resolve(file) // 不需要压缩，直接返回
    }
  })
}
```

<div class="memory-aid">
  <ul>
    <li><strong>入口：</strong>el-upload 的 :before-upload 钩子，返回 false 则中断上传</li>
    <li><strong>类型校验：</strong>提取扩展名转小写，与 filetypes 白名单比对</li>
    <li><strong>大小校验：</strong>file.size < Config.sizeMax * 1024 * 1024（默认10MB）</li>
    <li><strong>图片压缩：</strong>image-conversion 库自动压缩，Canvas 手动压缩签名图</li>
  </ul>
</div>

### 问题3：上传进度条怎么实现的？ {#q8-3}

<div class="original-text">
当前项目的上传进度条依赖 Element UI el-upload 组件的内置功能，无需额外代码。

实现原理：

1. 自动显示：el-upload 内部使用 XMLHttpRequest 的 upload.onprogress 事件监听上传进度
2. 进度反馈：组件会自动在文件列表中显示进度百分比和加载动画
3. 自定义扩展：如果需要更精细的控制，可以监听 :on-progress 事件获取 event.percent

在实际使用中，用户选择文件后，组件会自动显示上传进度，上传成功或失败后会更新文件状态图标。对于批量上传场景（wl_img_upload），通过 WLLoading 显示全局加载提示"文件上传中..."，上传完成后关闭。

</div>

```vue
<!-- el-upload 内置进度条，无需额外配置 -->
<el-upload
  :action="getReqUrl"
  :before-upload="beforeAvatarUpload"
  :on-success="doSuccess"
  :on-error="doErr"
  :on-change="doChange"
  :file-list="fileList"
  :auto-upload="true"
>
  <el-button size="mini" class="upload_icon">
    <svg-icon :icon-class="icon"></svg-icon>
  </el-button>
</el-upload>
```

```ts
// wl_img_upload.ts - 批量上传的全局进度提示
async submitUpload(param?: any) {
  if (this.fileList.length === 0) {
    wllib.global.WLWarnMessage("请选择可上传文件");
    return;
  }

  // 显示全局加载提示
  wllib.global.WLLoading(true, "文件上传中...")

  let reqList: any = [];
  this.fileList.forEach((file: any) => {
    let req: any = {
      ...this.uploadData,
      file: file.raw
    }
    // 批量上传请求加入队列
    reqList.push(wllib.net.wlBatchUpload(this.uploadUrl, req));
  });

  // 队列执行完成后关闭加载提示
  wllib.net.ajaxQueue(reqList).then((resList: any) => {
    this.fileList = [] // 清空上传文件列表
    this.uploadSuccessFile(resList);
  }, (err: any) => {
    this.fileList = []
    wllib.global.WLLoadingClose(); // 关闭全局加载
  })
}
```

<div class="memory-aid">
  <ul>
    <li><strong>内置功能：</strong>el-upload 自动监听 XHR progress 事件显示进度</li>
    <li><strong>批量场景：</strong>使用 WLLoading 显示"文件上传中..."全局提示</li>
    <li><strong>自定义：</strong>可通过 :on-progress 事件获取 event.percent 自定义UI</li>
  </ul>
</div>

### 问题4：断点续传有实现吗？ {#q8-4}

<div class="original-text">

核心思路：

1. 文件分片：将大文件切割成固定大小的块（如5MB），逐块上传
2. 哈希标识：使用 SparkMD5 计算文件唯一哈希，用于秒传和断点识别
3. 状态检查：上传前调用后端接口查询已上传的分片，跳过已完成部分
4. 并发控制：限制同时上传的分片数量（如3个），避免浏览器资源耗尽
5. 合并通知：所有分片上传完成后，通知后端合并文件

这个方案能有效解决大文件上传过程中的网络不稳定问题，提升用户体验。

</div>

```typescript
/**
 * 断点续传工具类
 * 支持大文件分片上传、断点续传、秒传等功能
 */
class ResumeUpload {
  private chunkSize: number = 5 * 1024 * 1024 // 分片大小，默认5MB
  private concurrentLimit: number = 3 // 并发上传数量限制
  private uploadedChunks: Set<number> = new Set() // 已上传的分片索引
  private fileHash: string = '' // 文件哈希值
  private totalChunks: number = 0 // 总分片数
  private uploadQueue: Array<() => Promise<void>> = [] // 上传队列
  private activeUploads: number = 0 // 当前活跃上传数

  /**
   * 初始化上传任务
   * @param file 要上传的文件对象
   * @param uploadUrl 上传接口地址
   * @param options 配置选项
   */
  async initUpload(
    file: File,
    uploadUrl: string,
    options: {
      chunkSize?: number
      concurrentLimit?: number
      onProgress?: (percent: number) => void
      onSuccess?: (result: any) => void
      onError?: (error: any) => void
    } = {},
  ) {
    try {
      // 合并配置
      this.chunkSize = options.chunkSize || this.chunkSize
      this.concurrentLimit = options.concurrentLimit || this.concurrentLimit

      // 计算文件哈希（用于秒传和断点续传标识）
      this.fileHash = await this.calculateFileHash(file)

      // 计算分片总数
      this.totalChunks = Math.ceil(file.size / this.chunkSize)

      // 检查是否支持秒传或需要断点续传
      const checkResult = await this.checkFileStatus(this.fileHash, uploadUrl)

      if (checkResult.exist) {
        // 文件已存在，直接返回成功（秒传）
        options.onSuccess?.({ message: '文件秒传成功', data: checkResult.data })
        return
      }

      // 获取已上传的分片信息（断点续传）
      this.uploadedChunks = new Set(checkResult.uploadedChunks || [])

      // 开始分片上传
      await this.startChunkUpload(file, uploadUrl, options)
    } catch (error) {
      options.onError?.(error)
      throw error
    }
  }

  /**
   * 计算文件哈希值（使用SparkMD5库）
   * @param file 文件对象
   * @returns 文件哈希字符串
   */
  private calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // 动态导入spark-md5库
      import('spark-md5')
        .then(({ default: SparkMD5 }) => {
          const spark = new SparkMD5.ArrayBuffer()
          const fileReader = new FileReader()
          const chunks = Math.ceil(file.size / this.chunkSize)
          let currentChunk = 0

          fileReader.onload = e => {
            spark.append(e.target!.result as ArrayBuffer)
            currentChunk++

            if (currentChunk < chunks) {
              loadNext()
            } else {
              resolve(spark.end())
            }
          }

          fileReader.onerror = () => {
            reject(new Error('文件读取失败'))
          }

          function loadNext() {
            const start = currentChunk * this.chunkSize
            const end = Math.min(start + this.chunkSize, file.size)
            fileReader.readAsArrayBuffer(file.slice(start, end))
          }

          loadNext()
        })
        .catch(reject)
    })
  }

  /**
   * 检查文件状态（是否已存在或已上传部分分片）
   * @param fileHash 文件哈希值
   * @param uploadUrl 上传接口地址
   * @returns 文件状态信息
   */
  private async checkFileStatus(
    fileHash: string,
    uploadUrl: string,
  ): Promise<{
    exist: boolean
    uploadedChunks?: number[]
    data?: any
  }> {
    try {
      const response = await fetch(`${uploadUrl}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileHash: fileHash,
          fileName: '', // 可选：文件名
          fileSize: 0, // 可选：文件大小
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('检查文件状态失败:', error)
      // 如果检查失败，假设文件不存在，从头开始上传
      return { exist: false, uploadedChunks: [] }
    }
  }

  /**
   * 开始分片上传
   * @param file 原始文件对象
   * @param uploadUrl 上传接口地址
   * @param options 配置选项
   */
  private async startChunkUpload(
    file: File,
    uploadUrl: string,
    options: {
      onProgress?: (percent: number) => void
      onSuccess?: (result: any) => void
      onError?: (error: any) => void
    },
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // 创建所有分片的上传任务
        for (let i = 0; i < this.totalChunks; i++) {
          if (!this.uploadedChunks.has(i)) {
            this.uploadQueue.push(() => this.uploadChunk(file, i, uploadUrl))
          }
        }

        // 执行上传队列
        await this.executeUploadQueue(options)

        // 所有分片上传完成后，合并文件
        const mergeResult = await this.mergeChunks(file.name, this.fileHash, uploadUrl)

        options.onSuccess?.(mergeResult)
        resolve()
      } catch (error) {
        options.onError?.(error)
        reject(error)
      }
    })
  }

  /**
   * 上传单个分片
   * @param file 原始文件对象
   * @param chunkIndex 分片索引
   * @param uploadUrl 上传接口地址
   */
  private async uploadChunk(file: File, chunkIndex: number, uploadUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = chunkIndex * this.chunkSize
      const end = Math.min(start + this.chunkSize, file.size)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', this.totalChunks.toString())
      formData.append('fileHash', this.fileHash)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())

      fetch(`${uploadUrl}/chunk`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // 携带cookie
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          // 标记该分片已上传
          this.uploadedChunks.add(chunkIndex)
          resolve()
        })
        .catch(error => {
          console.error(`分片 ${chunkIndex} 上传失败:`, error)
          reject(error)
        })
    })
  }

  /**
   * 执行上传队列（控制并发数）
   * @param options 配置选项
   */
  private async executeUploadQueue(options: {
    onProgress?: (percent: number) => void
  }): Promise<void> {
    return new Promise(resolve => {
      const next = () => {
        while (this.activeUploads < this.concurrentLimit && this.uploadQueue.length > 0) {
          this.activeUploads++
          const task = this.uploadQueue.shift()!

          task().finally(() => {
            this.activeUploads--

            // 更新进度
            const uploadedCount = this.uploadedChunks.size
            const percent = Math.round((uploadedCount / this.totalChunks) * 100)
            options.onProgress?.(percent)

            // 继续执行下一个任务
            if (this.uploadQueue.length > 0 || this.activeUploads > 0) {
              next()
            } else {
              resolve()
            }
          })
        }

        // 如果队列为空且没有活跃上传，则完成
        if (this.uploadQueue.length === 0 && this.activeUploads === 0) {
          resolve()
        }
      }

      next()
    })
  }

  /**
   * 合并所有分片
   * @param fileName 文件名
   * @param fileHash 文件哈希
   * @param uploadUrl 上传接口地址
   */
  private async mergeChunks(fileName: string, fileHash: string, uploadUrl: string): Promise<any> {
    try {
      const response = await fetch(`${uploadUrl}/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          fileHash: fileHash,
          totalChunks: this.totalChunks,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('合并分片失败:', error)
      throw error
    }
  }

  /**
   * 暂停上传
   */
  pauseUpload(): void {
    this.uploadQueue = []
    this.activeUploads = 0
  }

  /**
   * 恢复上传
   * @param file 原始文件对象
   * @param uploadUrl 上传接口地址
   * @param options 配置选项
   */
  resumeUpload(
    file: File,
    uploadUrl: string,
    options: {
      onProgress?: (percent: number) => void
      onSuccess?: (result: any) => void
      onError?: (error: any) => void
    },
  ): void {
    // 重新初始化上传流程，但保留已有的uploadedChunks信息
    this.initUpload(file, uploadUrl, options).catch(options.onError)
  }
}
```

```typescript
// 使用示例
const resumeUploader = new ResumeUpload()

// 开始上传
resumeUploader.initUpload(fileObject, '/api/upload', {
  chunkSize: 5 * 1024 * 1024, // 5MB分片
  concurrentLimit: 3, // 最多3个并发
  onProgress: percent => {
    console.log(`上传进度: ${percent}%`)
    // 更新UI进度条
  },
  onSuccess: result => {
    console.log('上传成功:', result)
  },
  onError: error => {
    console.error('上传失败:', error)
  },
})

// 暂停上传
// resumeUploader.pauseUpload();

// 恢复上传
// resumeUploader.resumeUpload(fileObject, '/api/upload', options);
```

<div class="memory-aid">
  <ul>
    <li><strong>现状：</strong>项目未实现断点续传，所有文件一次性完整上传</li>
    <li><strong>方案：</strong>文件分片（5MB）+ SparkMD5哈希 + 并发队列（3个）+ 后端合并</li>
    <li><strong>优势：</strong>网络中断后可续传，支持秒传（相同文件直接返回），提升大文件上传成功率</li>
    <li><strong>后端接口：</strong>需提供 /check（检查状态）、/chunk（上传分片）、/merge（合并文件）三个接口</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— 文件上传组件 · 面试笔记 ——</p>
