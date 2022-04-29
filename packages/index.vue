<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-use-before-define */
import { onMounted, ref, shallowRef } from 'vue'

export interface Options {
  el: HTMLElement
  width: number
  height: number
  onSuccess: (...args: any[]) => void
  onFail: (...args: any[]) => void
  onRefresh: (...args: any[]) => void
}

const props = defineProps({
  width: {
    type: Number,
    default: 310,
  },
  height: {
    type: Number,
    default: 155,
  },
  onSuccess: {
    type: Function,
    default: () => {
    },
  },
  onFail: {
    type: Function,
    default: () => {
    },
  },
  onRefresh: {
    type: Function,
    default: () => {
    },
  },
})
// eslint-disable-next-line vue/no-setup-props-destructure
const w = props.width // canvas宽度
// eslint-disable-next-line vue/no-setup-props-destructure
const h = props.height // canvas高度
const l = 42 // 滑块边长
const r = 9 // 滑块半径
const PI = Math.PI
const L = l + r * 2 + 3 // 滑块实际边长

function getRandomNumberByRange(start: number, end: number) {
  return Math.round(Math.random() * (end - start) + start)
}

function setSrc(img: HTMLImageElement, src: string) {
  img.src = src
}

function createImg(onload: (this: any, ev: Event) => any) {
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = onload
  img.onerror = () => {
    setSrc(img, getRandomImgSrc()) // 图片加载失败的时候重新加载其他图片
  }

  setSrc(img, getRandomImgSrc())
  return img
}

function getRandomImgSrc() {
  return `https://picsum.photos/id/${getRandomNumberByRange(0, 1084)}/${w}/${h}`
}

function drawPath(ctx: CanvasRenderingContext2D, x: number, y: number, operation: 'fill' | 'clip') {
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

const canvasRef = shallowRef<HTMLCanvasElement>()
const blockRef = shallowRef<HTMLCanvasElement>()
const offsetX = ref(0) // 滑块左偏移量
const maskWidth = ref(0)
const canvasCtx = shallowRef()
const blockCtx = shallowRef()
const blockPosX = ref(0)

function draw(img: HTMLImageElement) {
  // 随机位置创建拼图形状
  const x = getRandomNumberByRange(L + 10, w - (L + 10))
  const y = getRandomNumberByRange(10 + r * 2, h - (L + 10))
  blockPosX.value = x
  drawPath(canvasCtx.value, x, y, 'fill')
  drawPath(blockCtx.value, x, y, 'clip')

  // 画入图片
  canvasCtx.value.drawImage(img, 0, 0, w, h)
  blockCtx.value.drawImage(img, 0, 0, w, h)

  // 提取滑块并放到最左边
  const _y = y - r * 2 - 1
  const ImageData = blockCtx.value.getImageData(x - 3, _y, L, L)
  // 需要手动设置宽度裁剪，否则putImageData方法复制出的图像会和原图像同时显示在一个视图
  // todo 此处用ref绑定
  blockRef.value!.width = L
  blockCtx.value.putImageData(ImageData, 0, _y)
}

onMounted(() => {
  canvasCtx.value = canvasRef.value?.getContext('2d')
  blockCtx.value = blockRef.value?.getContext('2d')

  reset()

  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('touchmove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchend', handleDragEnd)
})

const isMouseDown = ref(false)
const originX = ref(0)
const originY = ref(0)
const trail = ref<number[]>([])

const handleDragStart = function(e: any) {
  originX.value = e.clientX || e.touches[0].clientX
  originY.value = e.clientY || e.touches[0].clientY
  isMouseDown.value = true
}
const handleDragMove = (e: any) => {
  if (!isMouseDown.value) return false
  e.preventDefault()
  const eventX = e.clientX || e.touches[0].clientX
  const eventY = e.clientY || e.touches[0].clientY
  const moveX = eventX - originX.value
  const moveY = eventY - originY.value
  if (moveX < 0 || moveX + 38 >= w) return false
  offsetX.value = moveX
  // this.slider.style.left = `${moveX}px`
  const blockLeft = ((w - 40 - 20) / (w - 40)) * moveX
  // this.block.style.left = `${blockLeft}px`

  maskWidth.value = moveX
  trail.value.push(moveY)
}

const actionResult = ref<'success' | 'fail' | ''>()

const handleDragEnd = (e: any) => {
  if (!isMouseDown.value) return false
  isMouseDown.value = false
  const eventX = e.clientX || e.changedTouches[0].clientX
  if (eventX === originX.value) return false
  isMouseDown.value = false
  const {
    spliced,
    verified,
  } = verify()
  if (spliced) {
    if (verified) {
      // addClass(this.sliderContainer, '')
      actionResult.value = 'success'
      setTimeout(() => {
        typeof props.onSuccess === 'function' && props.onSuccess()
      }, 1000)
    } else {
      actionResult.value = 'fail'
      // this.text.innerHTML = '请再试一次'
      reset()
    }
  } else {
    actionResult.value = 'fail'
    typeof props.onFail === 'function' && props.onFail()
    setTimeout(reset, 1000)
  }
}

function verify() {
  const average = trail.value.reduce(sum) / trail.value.length
  const deviations = trail.value.map(x => x - average)
  const stddev = Math.sqrt(deviations.map(square).reduce(sum) / trail.value.length)
  return {
    spliced: Math.abs(offsetX.value - blockPosX.value) < 10,
    verified: stddev !== 0, // 简单验证拖动轨迹，为零时表示Y轴上下没有波动，可能非人为操作
  }
}

function reset() {
  // 重置样式
  actionResult.value = ''
  // this.slider.style.left = `${0}px`
  // todo
  blockRef.value!.width = w
  // todo
  offsetX.value = 0
  maskWidth.value = 0
  // this.sliderMask.style.width = `${0}px`

  // 清空画布
  canvasCtx.value.clearRect(0, 0, w, h)
  blockCtx.value.clearRect(0, 0, w, h)

  // 重新加载图片
  // setLoadingState(true)
  const img = createImg(() => draw(img))
  // draw(img)
}

function refresh() {
  props.onRefresh()
  reset()
}

</script>
<template>
  <div id="slide-capcha" :style="{width: `${w}px`}">
    <canvas ref="canvasRef" :width="w" :height="h" />
    <canvas
      ref="blockRef" class="block" :width="w" :height="h" :style="{left: `${offsetX}px`}"
      @touchstart="handleDragStart" @mousedown="handleDragStart"
    />
    <div class="refreshIcon" @click="refresh" />
    <div
      :class="['sliderContainer', {sliderContainer_active: isMouseDown}, {sliderContainer_success: actionResult === 'success'}, {sliderContainer_fail: actionResult === 'fail'}]"
    >
      <div class="sliderMask" :style="{width: `${maskWidth}px`}">
        <div class="slider" :style="{left: `${offsetX}px`}" @touchstart="handleDragStart" @mousedown="handleDragStart">
          →
        </div>
      </div>
      <div v-show="!isMouseDown && offsetX === 0" class="sliderText">
        向右滑动填充拼图
      </div>
    </div>
  </div>
</template>
<style scoped>
#slide-capcha {
  position: relative;
  margin: 0 auto;
}

.block {
  position: absolute;
  left: 0;
  top: 0;
  cursor: pointer;
  cursor: grab;
}

.block:active {
  cursor: grabbing;
}

.sliderContainer {
  position: relative;
  text-align: center;
  width: 310px;
  height: 40px;
  line-height: 40px;
  margin-top: 15px;
  background: #f7f9fa;
  color: #45494c;
  border: 1px solid #e4e7eb;
}

.loadingContainer {
  display: none;
}

.loadingContainer.loading {
  display: block;
  pointer-events: none;
}

.sliderContainer_active .slider {
  height: 38px;
  top: -1px;
  border: 1px solid #1991FA;
}

.sliderContainer_active .sliderMask {
  height: 38px;
  border-width: 1px;
}

.sliderContainer_success .slider {
  height: 38px;
  top: -1px;
  border: 1px solid #52CCBA;
  background-color: #52CCBA !important;
}

.sliderContainer_success .sliderMask {
  height: 38px;
  border: 1px solid #52CCBA;
  background-color: #D2F4EF;
}

.sliderContainer_success .sliderIcon {
  background-position: 0 -26px !important;
}

.sliderContainer_fail .slider {
  height: 38px;
  top: -1px;
  border: 1px solid #f57a7a;
  background-color: #f57a7a !important;
}

.sliderContainer_fail .sliderMask {
  height: 38px;
  border: 1px solid #f57a7a;
  background-color: #fce1e1;
}

.sliderContainer_fail .sliderIcon {
  top: 14px;
  background-position: 0 -82px !important;
}

.sliderMask {
  position: absolute;
  left: 0;
  top: 0;
  height: 40px;
  border: 0 solid #1991FA;
  background: #D1E9FE;
}

.slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  background: #fff;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  transition: background .2s linear;
  cursor: pointer;
  cursor: grab;
}

.slider:active {
  cursor: grabbing;
}

.slider:hover {
  background: #1991FA;
}

.sliderIcon {
  position: absolute;
  top: 15px;
  left: 13px;
  width: 14px;
  height: 12px;
  background: url(https://cstaticdun.126.net//2.13.6/images/icon_light.4353d81.png) 0 -13px;
  background-size: 32px 544px;
}

.slider:hover .sliderIcon {
  background-position: 0 0;
}

.refreshIcon {
  position: absolute;
  right: 5px;
  top: 5px;
  width: 30px;
  height: 30px;
  cursor: pointer;
  background: url(https://cstaticdun.126.net//2.13.6/images/icon_light.4353d81.png) 0 -233px;
  background-size: 32px 544px;
}

.refreshIcon:hover {
  background-position: 0 -266px;
}

.loadingContainer {
  position: absolute;
  left: 0;
  top: 0;
  width: 310px;
  height: 155px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  color: #45494c;
  z-index: 2;
  background: #EDF0F2;
}

.loadingIcon {
  width: 32px;
  height: 32px;
  margin-bottom: 10px;
  background: url(https://cstaticdun.126.net//2.13.6/images/icon_light.4353d81.png) 0 -332px;
  background-size: 32px 544px;
  animation: loading-icon-rotate 0.8s linear infinite;
}

@keyframes loading-icon-rotate {
  from {
    transform: rotate(0)
  }
  to {
    transform: rotate(360deg)
  }
}

</style>
