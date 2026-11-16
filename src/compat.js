// Safari 14 (the iOS minimum) lacks these two modern helpers used by the UI.
if(!Object.hasOwn)Object.defineProperty(Object,'hasOwn',{value:(object,key)=>Object.prototype.hasOwnProperty.call(object,key),configurable:true,writable:true});
if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(index){index=Math.trunc(Number(index))||0;return this[index<0?this.length+index:index];},configurable:true,writable:true});
