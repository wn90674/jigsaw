import styles from './jigsaw.css'

const w = 310 // canvas宽度
const h = 155 // canvas高度
const l = 42 // 滑块边长
const r = 9 // 滑块半径
const PI = Math.PI
const L = l + r * 2 + 3 // 滑块实际边长

function getRandomNumberByRange(start: number, end: number) {
  return Math.round(Math.random() * (end - start) + start)
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
function setSrc(img: HTMLImageElement, src: string) {
  // const isIE = window.navigator.userAgent.includes('Trident')
  // if (isIE) {
  //   // IE浏览器无法通过img.crossOrigin跨域，使用ajax获取图片blob然后转为dataURL显示
  //   const xhr = new XMLHttpRequest();
  //   xhr.onloadend = function (e) {
  //     const file = new FileReader(); // FileReader仅支持IE10+
  //     file.readAsDataURL(e.target.response);
  //     file.onloadend = function (e) {
  //       img.src = e.target.result;
  //     };
  //   };
  //   xhr.open("GET", src);
  //   xhr.responseType = "blob";
  //   xhr.send();
  // } else
  img.src = src
}

function createImg(onload: (this: GlobalEventHandlers, ev: Event) => any) {
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = onload
  img.onerror = () => {
    setSrc(img, getRandomImgSrc()) // 图片加载失败的时候重新加载其他图片
  }

  setSrc(img, getRandomImgSrc())
  return img
}

function createElement(tagName: string, className?: string) {
  const element = document.createElement(tagName)
  className && (element.className = styles[className])
  return element
}

function setClass(element: HTMLElement, className: string) {
  element.className = styles[className]
}

function addClass(element: HTMLElement, className: string) {
  element.classList.add(styles[className])
}

function removeClass(element: HTMLElement, className: string) {
  element.classList.remove(styles[className])
}

function getRandomImgSrc() {
  return `https://picsum.photos/id/${getRandomNumberByRange(0, 1084)}/${w}/${h}`
}

function drawPath(ctx: CanvasRenderingContext2D, x: number, y: number, operation: 'fill'|'clip') {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.arc(x + l / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI)
  ctx.lineTo(x + l, y)
  ctx.arc(x + l + r - 2, y + l / 2, r, 1.21 * PI, 2.78 * PI)
  ctx.lineTo(x + l, y + l)
  ctx.lineTo(x, y + l)
  ctx.arc(x + r - 2, y + l / 2, r + 0.4, 2.76 * PI, 1.24 * PI, true)
  ctx.lineTo(x, y)
  ctx.lineWidth = 2
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.stroke()
  ctx.globalCompositeOperation = 'destination-over'
  operation === 'fill' ? ctx.fill() : ctx.clip()
}

function sum(x: number, y: number) {
  return x + y
}

function square(x: number) {
  return x * x
}

export interface Options {
  el: HTMLElement
  width: number
  height: number
  onSuccess: (...args: any[]) => void
  onFail: (...args: any[]) => void
  onRefresh: (...args: any[]) => void
}
class Jigsaw {
  private width = 0
  private height = 0
  private el = document.body
  onSuccess = () => {}
  onFail = () => {}
  onRefresh = () => {}

  private canvas!: HTMLCanvasElement
  private block!: HTMLCanvasElement
  private x = 0
  private y = 0
  trail: number[] = []
  img!: HTMLImageElement
  loadingContainer!: HTMLElement
  sliderContainer!: HTMLElement
  refreshIcon!: HTMLElement
  slider!: HTMLElement
  sliderMask!: HTMLElement
  sliderIcon!: HTMLElement
  text!: HTMLElement
  canvasCtx!: CanvasRenderingContext2D
  blockCtx!: CanvasRenderingContext2D

  constructor({
    el,
    width = w,
    height = h,
    onSuccess,
    onFail,
    onRefresh,
  }: Options) {
    Object.assign(el.style, {
      position: 'relative',
      width: `${width}px`,
      margin: '0 auto',
    })

    this.width = width
    this.height = height
    this.el = el
    this.onSuccess = onSuccess
    this.onFail = onFail
    this.onRefresh = onRefresh
  }

  init() {
    this.initDOM()
    this.initImg()
    this.bindEvents()
  }

  initDOM() {
    const { width, height } = this
    this.canvas = createCanvas(width, height) // 画布
    this.block = createCanvas(width, height) // 滑块
    setClass(this.block, 'block')
    this.sliderContainer = createElement('div', 'sliderContainer')
    this.sliderContainer.style.width = `${width}px`
    this.sliderContainer.style.pointerEvents = 'none'
    this.refreshIcon = createElement('div', 'refreshIcon')
    this.sliderMask = createElement('div', 'sliderMask')
    this.slider = createElement('div', 'slider')
    this.sliderIcon = createElement('span', 'sliderIcon')
    this.text = createElement('span', 'sliderText')
    this.text.innerHTML = '向右滑动填充拼图'

    // 增加loading
    this.loadingContainer = createElement('div', 'loadingContainer')
    this.loadingContainer.style.width = `${width}px`
    this.loadingContainer.style.height = `${height}px`
    const loadingIcon = createElement('div', 'loadingIcon')
    const loadingText = createElement('span')
    loadingText.innerHTML = '加载中...'
    this.loadingContainer.appendChild(loadingIcon)
    this.loadingContainer.appendChild(loadingText)

    this.el.appendChild(this.loadingContainer)
    this.el.appendChild(this.canvas)
    this.el.appendChild(this.refreshIcon)
    this.el.appendChild(this.block)
    this.slider.appendChild(this.sliderIcon)
    this.sliderMask.appendChild(this.slider)
    this.sliderContainer.appendChild(this.sliderMask)
    this.sliderContainer.appendChild(this.text)
    this.el.appendChild(this.sliderContainer)

    this.canvasCtx = this.canvas.getContext('2d')!
    this.blockCtx = this.block.getContext('2d')!
  }

  setLoading(isLoading: boolean) {
    this.loadingContainer.style.display = isLoading ? '' : 'none'
    this.sliderContainer.style.pointerEvents = isLoading ? 'none' : ''
  }

  initImg() {
    const img = createImg(() => {
      this.setLoading(false)
      this.draw(img)
    })
    this.img = img
  }

  draw(img: HTMLImageElement) {
    const { width, height } = this
    // 随机位置创建拼图形状
    this.x = getRandomNumberByRange(L + 10, width - (L + 10))
    this.y = getRandomNumberByRange(10 + r * 2, height - (L + 10))
    drawPath(this.canvasCtx, this.x, this.y, 'fill')
    drawPath(this.blockCtx, this.x, this.y, 'clip')

    // 画入图片
    this.canvasCtx.drawImage(img, 0, 0, width, height)
    this.blockCtx.drawImage(img, 0, 0, width, height)

    // 提取滑块并放到最左边
    const y = this.y - r * 2 - 1
    const ImageData = this.blockCtx.getImageData(this.x - 3, y, L, L)
    this.block.width = L
    this.blockCtx.putImageData(ImageData, 0, y)
  }

  bindEvents() {
    this.el.onselectstart = () => false
    this.refreshIcon.onclick = () => {
      this.reset()
      typeof this.onRefresh === 'function' && this.onRefresh()
    }

    let originX: number
    let originY: number
    let isMouseDown = false

    const handleDragStart = function(e: any) {
      originX = e.clientX || e.touches[0].clientX
      originY = e.clientY || e.touches[0].clientY
      isMouseDown = true
    }
    const width = this.width
    const handleDragMove = (e: any) => {
      if (!isMouseDown) return false
      e.preventDefault()
      const eventX = e.clientX || e.touches[0].clientX
      const eventY = e.clientY || e.touches[0].clientY
      const moveX = eventX - originX
      const moveY = eventY - originY
      if (moveX < 0 || moveX + 38 >= width) return false
      this.slider.style.left = `${moveX}px`
      const blockLeft = ((width - 40 - 20) / (width - 40)) * moveX
      this.block.style.left = `${blockLeft}px`

      addClass(this.sliderContainer, 'sliderContainer_active')
      this.sliderMask.style.width = `${moveX}px`
      this.trail.push(moveY)
    }

    const handleDragEnd = (e: any) => {
      if (!isMouseDown) return false
      isMouseDown = false
      const eventX = e.clientX || e.changedTouches[0].clientX
      if (eventX === originX) return false
      removeClass(this.sliderContainer, 'sliderContainer_active')
      const { spliced, verified } = this.verify()
      if (spliced) {
        if (verified) {
          addClass(this.sliderContainer, 'sliderContainer_success')
          typeof this.onSuccess === 'function' && this.onSuccess()
        } else {
          addClass(this.sliderContainer, 'sliderContainer_fail')
          this.text.innerHTML = '请再试一次'
          this.reset()
        }
      } else {
        addClass(this.sliderContainer, 'sliderContainer_fail')
        typeof this.onFail === 'function' && this.onFail()
        setTimeout(this.reset.bind(this), 1000)
      }
    }
    this.slider.addEventListener('mousedown', handleDragStart)
    this.slider.addEventListener('touchstart', handleDragStart)
    this.block.addEventListener('mousedown', handleDragStart)
    this.block.addEventListener('touchstart', handleDragStart)
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('touchmove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchend', handleDragEnd)
  }

  verify() {
    const arr = this.trail // 拖动时y轴的移动距离
    const average = arr.reduce(sum) / arr.length
    const deviations = arr.map(x => x - average)
    const stddev = Math.sqrt(deviations.map(square).reduce(sum) / arr.length)
    const left = parseInt(this.block.style.left)
    return {
      spliced: Math.abs(left - this.x) < 10,
      verified: stddev !== 0, // 简单验证拖动轨迹，为零时表示Y轴上下没有波动，可能非人为操作
    }
  }

  reset() {
    const { width, height } = this
    // 重置样式
    setClass(this.sliderContainer, 'sliderContainer')
    this.slider.style.left = `${0}px`
    this.block.width = width
    this.block.style.left = `${0}px`
    this.sliderMask.style.width = `${0}px`

    // 清空画布
    this.canvasCtx.clearRect(0, 0, width, height)
    this.blockCtx.clearRect(0, 0, width, height)

    // 重新加载图片
    this.setLoading(true)
    setSrc(this.img, getRandomImgSrc())
  }
}

if (typeof window !== undefined) {
  window.jigsaw = {
    init(opts: Options) {
      return new Jigsaw(opts).init()
    },
  }
}
