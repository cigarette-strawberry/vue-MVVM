// 第五步
// 观察者   (发布订阅)   观察者   被观察者
class Dep {
  constructor() {
    this.subs = [] // 存放所有的watcher
  }
  // 订阅
  addSub(watcher) {
    // 添加 watcher
    this.subs.push(watcher)
  }
  // 发布
  notify() {
    this.subs.forEach((watcher) => watcher.update())
  }
}
// new Watcher
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    // 默认先存放一个老值
    this.oldValue = this.get()
  }
  get() {
    // vm.$data.school  vm.$data.school.name
    Dep.target = this // 先把自己放在 this 上
    // 取值 把这个 观察者 和 数据 关联起来
    let value = CompileUtil.getVal(this.vm, this.expr)
    Dep.target = null // 不取消 任何值取值 都会添加watcher
    return value
  }
  update() {
    // 更新操作 数据变化后 会调用观察者的update方法
    let newVal = CompileUtil.getVal(this.vm, this.expr)
    if (newVal !== this.oldValue) {
      this.cb(newVal)
    }
  }
}
// vm.$watch(vm, 'school.name', (newVal) => {

// })
// 第四步
class Observer {
  //实现数据劫持功能
  //1
  constructor(data) {
    // console.log(data)
    this.observer(data)
  }
  //2
  observer(data) {
    // 如果是对象才观察
    if (data && typeof data == 'object') {
      // 如果是对象
      for (let key in data) {
        this.defineReactive(data, key, data[key])
      }
    }
  }
  //3
  defineReactive(obj, key, value) {
    this.observer(value)
    let dep = new Dep() // 给每一个属性 都加上一个具有发布订阅的功能
    Object.defineProperty(obj, key, {
      get() {
        // 创建watcher时 会取到对应的内容，并且把watcher放到了全局上
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: (newVal) => {
        // {school:{name:''小吴}} school = {}
        if (newVal != value) {
          this.observer(newVal)
          value = newVal
          dep.notify()
        }
      },
    })
  }
}
// 基类 调用
// 第二步
class Compiler {
  // 2.1
  constructor(el, vm) {
    //   判断el属性 是不是一个元素 如果不是元素 那就获取他
    this.el = this.isElementNode(el) ? el : document.querySelector(el) //拿到模板
    // console.log(this.el)

    this.vm = vm
    console.log(this.vm, vm)
    // 把当前节点中的元素 获取到 放到内存中
    let fragment = this.node2fragment(this.el)
    console.log(fragment)

    // 把节点中的内容进行替换

    // 编译模板 用数据编译
    this.compile(fragment)
    // 把内容塞到页面中
    this.el.appendChild(fragment)
  }
  // 2.7
  // 是否以 v- 开头并返回
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  // 2.5
  // 编译元素
  compileElement(node) {
    let attributes = node.attributes //类数组
    ;[...attributes].forEach((attr) => {
      //type="text" v-model="school.name"
      // console.log(attr)
      let { name, value: expr } = attr //v-model="school.name"
      // console.log(expr)
      // console.log(name, expr)
      // 判断是不是指令
      if (this.isDirective(name)) {
        //v-model v-html v-bind
        // console.log(node, 'element')
        let [, directive] = name.split('-') // v-on:click
        let [directiveName, eventName] = directive.split(':')
        // console.log(name)
        // console.log(directive)
        // 需要调用不同的指令来处理
        CompileUtil[directiveName](node, expr, this.vm, eventName)
        // console.log(this.vm)
      }
    })
  }
  // 2.6
  // 编译文本
  compileText(node) {
    //判断当前文本节点中内容是否包含 {{}} {{aaa}} {{bbb}}
    let content = node.textContent
    // console.log(content, '内容')
    if (/\{\{(.+?)\}\}/.test(content)) {
      // console.log(content, 'text')   //找到所有的文本
      // 文本节点
      CompileUtil['text'](node, content, this.vm) // {{a}}  {{b}}
    }
  }
  // 2.4
  // 核心的编译方法
  compile(node) {
    //用来编译内存中的dom节点
    let childNodes = node.childNodes
    console.log(childNodes)
    ;[...childNodes].forEach((child) => {
      // console.log(child)
      if (this.isElementNode(child)) {
        // console.log('element', child) v-model v-on v-bind
        this.compileElement(child)
        // 如果是元素的话 需要把自己传进去 再去遍历子节点
        this.compile(child)
      } else {
        // console.log('text', child) {{}}
        this.compileText(child)
      }
    })
  }
  // 2.3
  // 把节点移动到内存中
  node2fragment(node) {
    // 创建一个文档碎片
    let fragment = document.createDocumentFragment()
    let firstChild
    // 看不懂这一步   firstChild = node.firstChild   ？？？？？？
    while ((firstChild = node.firstChild)) {
      // console.log(firstChild)
      //appendChild具有移动性
      fragment.appendChild(firstChild)
    }
    return fragment
  }
  // 2.2
  isElementNode(node) {
    //是不是元素节点
    return node.nodeType === 1
  }
}
// 第三步
CompileUtil = {
  //5
  // 根据表达式取到对应的数据
  getVal(vm, expr) {
    //vm.$data   "school.name"   [school,name]
    // console.log(vm.$data)
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  //7
  setValue(vm, expr, value) {
    // vm.$data  'school.name' = '小雨'
    expr.split('.').reduce((data, current, index, arr) => {
      if (index == arr.length - 1) {
        return (data[current] = value)
      }
      return data[current]
    }, vm.$data)
  },
  //1
  // 解析 v-model 这个指令
  model(node, expr, vm) {
    //node是节点  expr是表达式  vm是当前实例   school.name vm.$data
    // 给输入框赋予value属性   node.value = xxx
    // console.log(node, expr, vm)
    let fn = this.updater['modelUpdater']
    new Watcher(vm, expr, (newVal) => {
      // 给输入框加一个观察者模式 如果稍后数据更新了会触发此方法，会拿新值 给输入框赋值
      fn(node, newVal)
    })
    node.addEventListener('input', (e) => {
      let value = e.target.value // 获取用户输入的内容
      this.setValue(vm, expr, value)
    })
    let value = this.getVal(vm, expr) //小吴
    fn(node, value)
  },
  //2
  html(node, expr, vm) {
    // v-html="message"
    // node.innerHTML = xxx
    // 给输入框赋予value属性   node.value = xxx
    // console.log(node, expr, vm)
    let fn = this.updater['htmlUpdater']
    new Watcher(vm, expr, (newVal) => {
      // 给输入框加一个观察者模式 如果稍后数据更新了会触发此方法，会拿新值 给输入框赋值
      fn(node, newVal)
    })
    let value = this.getVal(vm, expr) //小吴
    fn(node, value)
  },
  //6
  getContentValue(vm, expr) {
    // 遍历表达式 将内容 重新替换成一个完整的内容 返还回去
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(vm, args[1])
    })
  },
  //8
  on(node, expr, vm, eventName) {
    // v-on:click="changge"  expr
    node.addEventListener(eventName, (e) => {
      vm[expr].call(vm, e) //this.change
    })
  },
  //3
  text(node, expr, vm) {
    // expr => {{a}} {{b}} {{c}}
    let fn = this.updater['textUpdater']
    let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      // 给表达式每 {{}} 都加上观察者
      new Watcher(vm, args[1], () => {
        fn(node, this.getContentValue(vm, expr)) // 返回一个全的字符串
      })
      return this.getVal(vm, args[1])
    })
    fn(node, content)
  },
  //4
  updater: {
    //1
    // 把数据插入到节点中
    modelUpdater(node, value) {
      node.value = value
    },
    //2
    htmlUpdater(node, value) {
      // 不安全 可能会导致 xss攻击
      node.innerHTML = value
    },
    //3
    // 处理文本节点的
    textUpdater(node, value) {
      node.textContent = value
    },
  },
}
// 第一步
class Vue {
  //1
  constructor(options) {
    console.log(options, this)

    // this.$el $data $options
    this.$el = options.el //$el等于模板   '#app'
    this.$data = options.data //$data等于数据
    let computed = options.computed
    let methods = options.methods
    if (this.$el) {
      //2
      // 把数据全部转化成用Object.defineProperty来定义
      // Object.defineProperty(obj, prop, descriptor) 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性，并返回此对象。
      // obj
      // 要定义属性的对象。
      // prop
      // 要定义或修改的属性的名称或 Symbol 。
      // descriptor
      // 要定义或修改的属性描述符。
      new Observer(this.$data)
      // console.log(this.$data)

      //4
      // {{getNewName}} reduce vm.$data.getNewName
      for (let key in computed) {
        // 有依赖关系 数据
        Object.defineProperty(this.$data, key, {
          get: () => {
            return computed[key].call(this)
            // 箭头函数中没有this指向 它会向上找 也就是 Vue
          },
        })
      }

      //5
      for (let key in methods) {
        Object.defineProperty(this, key, {
          get() {
            return methods[key]
          },
        })
      }

      //3
      // 把数据获取操作 vm上的取值操作 都代理到 vm.$data
      this.proxyVm(this.$data)

      //1
      new Compiler(this.$el, this)
    }
  }
  //2
  // backbone set() get()
  proxyVm(data) {
    for (let key in data) {
      // {scholl:{name,age}}
      Object.defineProperty(this, key, {
        //实现可以通过vm取到对应的内容
        get() {
          return data[key] // 进行了转化操作
        },
        set(newVal) {
          // 设置代理方法
          data[key] = newVal
        },
      })
    }
  }
}
