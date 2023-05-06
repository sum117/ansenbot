// Função para converter um objeto em FormData
// TODO: Ughhh, Sum said it makes sense whatever that means!
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function jsonToFormData(obj: any): FormData {
  const formData = new FormData();

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Se o valor for um array, adicione cada elemento individualmente
      if (Array.isArray(value)) {
        for (const item of value) {
          formData.append(`${key}`, item as any);
        }
      } else {
        // Se o valor for um objeto, converta-o em JSON antes de adicioná-lo
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }

  return formData;
}
