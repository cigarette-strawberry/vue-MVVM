class Vue {
  constructor(options) {
    console.log(options)

    // this.$el $data $options
    this.$el = options.el //$el等于模板   '#app'
    this.$data = options.data //$data等于数据
    let computed = options.computed
    let methods = options.methods
    // 存在根元素进行编译
    if (this.$el) {
      // 把数据全部转化成用Object.defineProperty来定义
      // Object.defineProperty(obj, prop, descriptor) 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性，并返回此对象。
      // obj 要定义属性的对象。
      // prop 要定义或修改的属性的名称或 Symbol 。
      // descriptor 要定义或修改的属性描述符。
      new Observer(this.$data)

      // {{getNewName}} reduce vm.$data.getNewName
      for (let key in computed) {
        // 有依赖关系 数据
        Object.defineProperty(this.$data, key, {
          get: () => {
            return computed[key].call(this)
            // 箭头函数中没有this指向 它会向上找 也就是 Vue
          }
        })
      }

      for (let key in methods) {
        Object.defineProperty(this, key, {
          get() {
            return methods[key]
          }
        })
      }

      // 把数据获取操作 vm上的取值操作 都代理到 vm.$data
      this.proxyVm(this.$data)

      new Compiler(this.$el, this)
    }
  }
  // backbone set() get()
  proxyVm(data) {
    for (let key in data) {
      // {school:{name,age}}
      Object.defineProperty(this, key, {
        //实现可以通过vm取到对应的内容
        get() {
          return data[key] // 进行了转化操作
        },
        set(newVal) {
          // 设置代理方法
          data[key] = newVal
        }
      })
    }
  }
}

class Observer {
  // 数据的观察者
  //实现数据劫持功能
  constructor(data) {
    this.observer(data)
  }

  observer(data) {
    // 如果是对象才观察
    if (data && typeof data == 'object') {
      for (let key in data) {
        this.defineReactive(data, key, data[key]) // 对象，属性，属性值
      }
    }
  }

  defineReactive(obj, key, value) {
    this.observer(value) // 如果属性值还是一个对象就会重复上一步骤 this.observer 递归
    let dep = new Dep() // 给每一个属性 都加上一个具有发布订阅的功能
    Object.defineProperty(obj, key, {
      get() {
        // 创建watcher时 会取到对应的内容，并且把watcher放到了全局上
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: newVal => {
        // {school:{name:''小吴}} school = {}
        if (newVal != value) {
          this.observer(newVal) // 递归
          value = newVal
          dep.notify()
        }
      }
    })
  }
}

class Compiler {
  constructor(el, vm) {
    // 判断 el 属性 是不是一个元素 如果不是元素 那就获取它
    this.el = this.isElementNode(el) ? el : document.querySelector(el) //拿到模板

    this.vm = vm
    // 把获取到的 当前节点中的元素  放到内存中
    let fragment = this.node2fragment(this.el)
    console.log(fragment)

    // 把节点中的内容进行替换

    // 编译模板 用数据编译
    this.compile(fragment)

    // 把内容再塞到页面中
    this.el.appendChild(fragment)
  }

  // 是不是元素节点
  isElementNode(node) {
    return node.nodeType === 1
  }

  // 把节点移动到内存中
  node2fragment(node) {
    // 创建一个文档碎片
    let fragment = document.createDocumentFragment()
    let firstChild
    // DOM 映射
    while ((firstChild = node.firstChild)) {
      //appendChild具有移动性 拿到一个少一个儿子节点
      fragment.appendChild(firstChild)
    }
    return fragment
  }

  // 核心的编译方法
  compile(node) {
    //用来编译内存中的dom节点
    let childNodes = node.childNodes // 只获取当前元素下的第一层子元素 （包含空文本text）
    console.log(childNodes) // 拿到子节点 （元素 看它有没有 v-model） （文本 看它有没有 {{}}）
    ;[...childNodes].forEach(child => {
      if (this.isElementNode(child)) {
        // 元素
        this.compileElement(child)
        // 如果是元素的话 需要把自己传进去 再去遍历子节点
        this.compile(child)
      } else {
        // 文本
        // console.log('text', child)
        this.compileText(child)
      }
    })
  }

  // 编译元素
  compileElement(node) {
    // node 是否具有 v-model   获取DOM属性
    let attributes = node.attributes //　获取DOM属性　类数组
    // 循环元素的所有属性 查看是否具有 v- 开头的
    ;[...attributes].forEach(attr => {
      //type="text" v-model="school.name"
      // console.log(attr)
      let { name, value: expr } = attr // 解构赋值 v-model="school.name" 把value赋值给expr
      // 判断是不是指令
      if (this.isDirective(name)) {
        //v-model v-html v-bind
        // console.log(node, 'element')
        let [, directive] = name.split('-') // v-on:click
        // directive 就是 model html bind
        let [directiveName, eventName] = directive.split(':')
        // 需要调用不同的指令来处理
        CompileUtil[directiveName](node, expr, this.vm, eventName)
        // console.log(this.vm)
      }
    })
  }

  // 是否以 v- 开头并返回
  isDirective(attrName) {
    return attrName.startsWith('v-') // 判断当前字符串 是否以 v- 开头
  }

  // 编译文本
  compileText(node) {
    //判断当前文本节点中内容是否包含 {{}} {{aaa}} {{bbb}}
    let content = node.textContent // 表示一个节点及其后代的文本内容
    // console.log(content, '内容')
    if (/\{\{(.+?)\}\}/.test(content)) {
      // console.log(content, 'text')   //找到所有的文本
      // 文本节点
      CompileUtil['text'](node, content, this.vm) // {{a}}  {{b}}
    }
  }
}

// 观察者   (发布订阅)   观察者   被观察者
class Dep {
  // 依赖管理
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
    this.subs.forEach(watcher => watcher.update())
  }
}

class Watcher {
  // 订阅者
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

CompileUtil = {
  // 解析 v-model 这个指令
  model(node, expr, vm) {
    //node是节点  expr是表达式  vm是当前实例   school.name vm.$data
    // 给输入框赋予value属性   node.value = xxx
    let fn = this.updater['modelUpdater']
    new Watcher(vm, expr, newVal => {
      // 给输入框加一个观察者模式 如果稍后数据更新了会触发此方法，会拿新值 给输入框赋值
      fn(node, newVal)
    })
    node.addEventListener('input', e => {
      let value = e.target.value // 获取用户输入的内容
      this.setValue(vm, expr, value)
    })
    let value = this.getVal(vm, expr) //小吴
    fn(node, value)
  },
  html(node, expr, vm) {
    // v-html="message"
    // node.innerHTML = xxx
    // 给输入框赋予value属性   node.value = xxx
    let fn = this.updater['htmlUpdater']
    new Watcher(vm, expr, newVal => {
      // 给输入框加一个观察者模式 如果稍后数据更新了会触发此方法，会拿新值 给输入框赋值
      fn(node, newVal)
    })
    let value = this.getVal(vm, expr) //小吴
    fn(node, value)
  },
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
  updater: {
    // 把数据插入到节点中
    modelUpdater(node, value) {
      node.value = value
    },
    htmlUpdater(node, value) {
      // 不安全 可能会导致 xss攻击
      node.innerHTML = value
    },
    // 处理文本节点的
    textUpdater(node, value) {
      node.textContent = value
    }
  },
  // 根据表达式取到对应的数据
  getVal(vm, expr) {
    //vm.$data   "school.name"   [school,name]
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  getContentValue(vm, expr) {
    // 遍历表达式 将内容 重新替换成一个完整的内容 返还回去
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(vm, args[1])
    })
  },
  setValue(vm, expr, value) {
    // vm.$data  'school.name' = '小雨'
    expr.split('.').reduce((data, current, index, arr) => {
      if (index == arr.length - 1) {
        return (data[current] = value)
      }
      return data[current]
    }, vm.$data)
  },
  on(node, expr, vm, eventName) {
    // v-on:click="change"  expr
    node.addEventListener(eventName, e => {
      vm[expr].call(vm, e) //this.change
    })
  }
}
