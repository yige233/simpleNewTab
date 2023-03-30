export default {
  newTab: {
    title: "新标签页",
    newNote: "请输入一个便签标题：",
  },
  config: {
    description: "说明",
    defaultNote: {
      name: "默认便签配置",
      desc: "便签的默认样式。包括便签的尺寸、透明度、标题文字颜色、内容文字字号和默认内容。",
      fontColor: "标题文字颜色",
      fontSize: "内容文字字号(px)",
      opacity: "透明度(%)",
      content: "默认内容",
      size: {
        desc: "便签尺寸(px)",
        height: "高度",
        width: "宽度",
      },
      defaultTitle: {
        desc: "默认便签标题",
        value: "便签",
      },
    },
    allowDrag: {
      name: "壁纸拖动",
      desc: "控制新标签页的壁纸是否能被拖动。",
      current: "当前的状态",
      on: "开启",
      off: "关闭",
    },
    animation: {
      name: "壁纸动画",
      desc: "提供了一些选项，可以控制动画的属性，包括持续时间、延迟、关键帧之间的变化方式。",
      delay: "动画开始的延迟(s)",
      duration: "动画持续的时长(s)",
      function: {
        desc: "关键帧之间的变化方式",
        option: {
          linear: "动画从头到尾的速度是相同的。",
          ease: "动画以低速开始，然后加快，在结束前变慢。",
          "ease-in": "动画以低速开始。",
          "ease-out": "动画以低速结束。",
          "ease-in-out": "动画以低速开始和结束。",
        },
      },
    },
    api: {
      name: "壁纸API",
      desc: "用于获取壁纸图片的网址，如果有多个API，扩展将会从多个API中根据权重随机选择。",
      current: "当前的值",
      api: {
        type: "API类型",
        config: {
          desc: "API配置",
          error: "API配置结构错误",
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
      change: "修改为",
      current: "当前的值",
    },
    defaultPic: {
      name: "默认壁纸",
      desc: "可以选择设置一张默认壁纸，当所有API及必应都无法访问时，就会使用该壁纸。",
      view: {
        desc: "查看壁纸",
        btn: "查看",
        fail: "查看壁纸失败。",
      },
      set: {
        desc: "设置壁纸",
        btn: "选择",
        ok: "成功设置壁纸。",
        fail: "设置壁纸失败。",
      },
      delete: {
        desc: "删除壁纸",
        btn: "删除",
        ok: "成功删除壁纸。",
      },
    },
    dragSenstive: {
      name: "壁纸拖动敏感度",
      desc: "控制拖动壁纸的灵敏度，数字越大，灵敏度越低。注意：对于不同尺寸的图片来说，这个灵敏度可能表现不同。",
      current: "当前的值",
    },
    editJson: {
      name: "编辑JSON格式的配置",
      desc: "直接编辑JSON格式的配置。页面内其他设置项需要刷新页面才能更新。",
      content: "配置内容",
      error: "配置结构有误",
      restore: {
        desc: "恢复默认配置",
        btn: "恢复默认",
        ok: "已经将默认配置覆盖到编辑框。进行任意编辑以触发自动保存。",
      },
    },
    keyframe: {
      name: "壁纸动画关键帧",
      desc: "可以定义动画的关键帧。和上面的壁纸动画一起，可以自定义壁纸的出现方式。填入css即可",
      frames: {
        desc: "关键帧列表",
        btn: "删除",
      },
      new: {
        desc: "新增关键帧",
        btn: "添加",
        error: "需要提供关键在名称",
        name: "关键帧",
        css: "CSS",
      },
    },
    preferBing: {
      name: "除API外优先使用的壁纸",
      desc: "设置当所有API都无法访问时，优先使用的壁纸源。如果其中有一者无法使用就会使用另一者。如果两者都无法使用，会使用系统默认新标签页。",
      state: {
        desc: "当前的状态",
        custom: "自定义默认壁纸",
        bing: "必应壁纸",
      },
      btn: "切换状态",
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
    null: {
      name: "提示",
      tip: "一个便签也没有哦！",
    },
  },
  option: {
    title: "编辑设置",
    basicConf: "基本设置",
    noteEdit: "编辑便签",
    links: "一些链接",
    extPage: "扩展程序Github页面",
    apiPage: "API程序Github页面",
    footer: "一般而言，更改都会自动保存。",
  },
};
