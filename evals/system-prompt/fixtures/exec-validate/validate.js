export function formatErrors(errs) {
  return errs.length ? `校验失败：${errs.length} 个文件有问题` : "校验通过";
}
