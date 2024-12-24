export default {
  newTab: {
    title: "新标签页",
    newNote: "请输入一个便签标题：",
    cancel: "取消",
    menu: {
      savePosition: "保存壁纸位置",
      restorePosition: "恢复默认壁纸位置",
      newNote: "建立一个便签",
      imageSearch: "选择图片，进行搜图",
      rollWallpaper: "切换Chrome OS 壁纸",
    },
  },
  config: {
    description: "说明",
    defaultNote: {
      name: "默认便签配置",
      desc: "便签的默认样式。包括便签的尺寸、透明度、标题文字颜色、内容文字字号和默认内容。",
      fontColor: "标题文字颜色：",
      fontSize: "内容文字字号(px)：",
      opacity: "透明度(%)：",
      content: "默认内容：",
      size: {
        desc: "便签尺寸(px)：",
        height: "高度",
        width: "宽度",
      },
      defaultTitle: {
        desc: "默认便签标题：",
        value: "便签",
      },
    },
    dragSetting: {
      name: "壁纸拖动",
      desc: "控制新标签页的壁纸是否能被拖动，以及壁纸对拖动的敏感度。",
      enabled: {
        name: "是否能被拖动",
        status: "当前的状态：",
      },
      senstive: {
        name: "壁纸拖动敏感度",
        desc: "控制拖动壁纸的灵敏度，数字越大，灵敏度越低。对于不同宽高比例的图片来说，这个灵敏度可能表现不同。",
      },
    },
    animation: {
      name: "壁纸动画",
      desc: "提供了一些选项，可以控制动画的属性，包括持续时间、延迟、关键帧之间的变化方式。\n可以定义动画的关键帧。和上面的壁纸动画一起，可以自定义壁纸的出现方式。填入css即可",
      delay: "动画开始的延迟(s)：",
      duration: "动画持续的时长(s)：",
      function: {
        desc: "关键帧之间的变化方式：",
        option: {
          linear: "动画从头到尾的速度是相同的。",
          ease: "动画以低速开始，然后加快，在结束前变慢。",
          "ease-in": "动画以低速开始。",
          "ease-out": "动画以低速结束。",
          "ease-in-out": "动画以低速开始和结束。",
        },
      },
      keyframes: {
        name: "关键帧列表",
        frame: "关键帧",
        css: "CSS",
        btnDel: "删除",
        new: "新增关键帧",
        error: "需要提供关键在名称",
        btnAdd: "添加",
      },
    },
    api: {
      name: "壁纸API",
      desc: "用于获取壁纸图片的网址，如果有多个API，扩展将会从多个API中根据权重随机选择。",
      current: "当前的API",
      api: {
        type: "API类型",
        config: {
          name: "API配置",
          desc: "通过API配置来调整API行为",
        },
        weight: {
          name: "API权重",
          desc: "当存在多个api可选的时候，选中该api的概率。即：本api权重/所有api权重之和",
        },
      },
      add: {
        name: "新增",
        desc: "新的API地址",
        fail: "不正确的API地址：",
      },
      delete: "删除",
    },
    bgColor: {
      name: "一般背景色",
      desc: "壁纸尚未加载完成时的背景颜色。",
      change: "当前的值：",
    },
    defaultPic: {
      name: "默认壁纸",
      desc: "可以选择设置一张默认壁纸，当所有API及必应都无法访问时，就会使用该壁纸。",
      preferBing: "只有默认壁纸和必应壁纸可用时，优先使用必应壁纸：",
      view: {
        desc: "查看壁纸",
        fail: "查看壁纸失败。",
      },
      set: {
        desc: "设置壁纸",
        ok: "成功设置壁纸。",
        fail: "设置壁纸失败。",
      },
      delete: {
        desc: "删除壁纸",
        ok: "成功删除壁纸。",
      },
    },
    dragSenstive: {
      name: "壁纸拖动敏感度",
      desc: "控制拖动壁纸的灵敏度，数字越大，灵敏度越低。注意：对于不同尺寸的图片来说，这个灵敏度可能表现不同。",
      current: "当前的值：",
    },
    editJson: {
      name: "编辑JSON格式的配置",
      desc: "直接编辑JSON格式的配置。页面内其他设置项需要刷新页面才能更新；其他设置项的更改也不会实时反映到这里。",
      content: "配置内容",
      error: "配置结构有误",
      restore: {
        question: "确定要恢复默认配置？",
        desc: "该操作会重置除了便签数据外的所有配置。页面将会刷新。",
        btn: "恢复默认",
      },
    },
    imageSearch: {
      name: "图片来源搜索",
      desc: "快捷调用各大图片搜索网站。可以将图片直接拖放到新标签页中进行搜索，也可以在新标签页打开菜单，选择图片上传搜索。搜索引擎一些搜索引擎有限制，体积太大的图会让其罢工。",
      enable: "启用这个功能：",
      available: "可用的搜索引擎列表。勾选意味着该搜索引擎会在搜图时自动勾选",
      engines: {
        bing: "必应图像搜索。某些情况下搜索结果会有惊喜。如果只能打开cn.bing.com的话，这个搜索引擎将无法使用。图像太大也无法使用。",
        google: "谷歌图片搜索。最为泛用的图片搜索引擎。需要能够访问到谷歌的网络。",
        baidu: "百度搜图。适合搜索国内来源的图。不能上传太大的图片。",
        yandex: "yandex搜图。经常能搜到一些犄角旮旯里的图。需要能够访问到yandex的网络。",
        saucenao: "sauceNAO。适合搜索二次元图片，尤其是pixiv，但需要图片本身质量OK，不能太糊或者太残缺。",
        ascii2d: "日语网站。适合二次元图片，但结果通常不太好。",
        tinyeye: "TinyEye。偶尔能查找到有用的结果。",
      },
    },
    chromeOSwallpaper: {
      name: "ChromeOS 桌面壁纸",
      desc: "如果运行本扩展程序的设备是 Chrome OS 设备，那么本扩展程序支持通过API设置 Chrome OS 桌面壁纸。需要重新加载扩展程序，以应用修改。",
      enable: "允许扩展程序控制你的 ChromeOS 桌面壁纸",
      rollFrequency: "壁纸自动切换的频率（分钟），调整粒度为半分钟。调为0分钟，将禁用自动切换，只能通过新标签页菜单切换。",
      rollLimit: "允许自动切换壁纸的最低设备电量（%）。当电池电量低于该值时，将暂停壁纸自动切换，直到连接电源或者电量高于此值。",
    },
    reloadExtension: {
      name: "重新加载扩展程序",
      desc: "由于扩展程序存在着一个始终在后台运行的ServieWorker，因此一些设置不会立即生效，需要手动重载扩展程序。该操作会关闭所有本扩展程序控制的页面。",
      btn: "重新加载",
    },
    updateTip: {
      name: "更新提示",
      desc: "在每次扩展更新后，生成一个含有简要更新内容介绍的便签",
      status: "当前的状态：",
    },
  },
  note: {
    id: "便签id",
    title: "便签标题",
    color: "标题栏颜色",
    content: "便签内容",
    fontColor: "标题文字颜色",
    fontSize: "内容文字字号(px)",
    opacity: "便签透明度(%)",
    delete: {
      question: "确定要删除该便签？",
      desc: "删除便签",
      btn: "删除",
    },
    position: {
      desc: "便签位置(px)",
      left: "距离左侧",
      top: "距离顶部",
    },
    size: {
      desc: "便签尺寸(px)",
      height: "高度",
      width: "宽度",
    },
  },
  imageSearch: {
    dialog: {
      engine: "选择要使用的图片搜索引擎",
      pic: "选择图片",
      cancel: "取消",
    },
    titles: {
      yandex: "正在上传图片到yandex……",
      baidu: "正在上传图片到百度……",
      tinyeye: "正在上传图片到tinyeye……",
    },
  },
  settings: {
    title: "编辑设置",
    extPage: "扩展程序Github页面",
    apiPage: "API程序Github页面",
    top: "回到顶部",
    index: "目录",
  },
  dialog: {
    ok: "确定",
    cancel: "取消",
  },
  updateTip: {
    name: "《简单新标签页》已更新",
    desc: "《简单新标签页》扩展程序已经更新到了 {version} 版本。\n该版本修复了一些情况下新标签页标题不能正确显示的问题；\n优化了扩展在更新后的提示方式。\n\n如需了解完整更新内容，请前往 {homepage} 查看commit信息。\n右键该便签的标题栏，即可删除此条通知。",
  },
};
