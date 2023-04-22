// Função para converter um objeto em FormData
export default function jsonToFormData(obj: any): FormData {
  const formData = new FormData();

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Se o valor for um array, adicione cada elemento individualmente
      if (Array.isArray(value)) {
        for (const item of value) {
          formData.append(`${key}`, item);
        }
      } else {
        // Se o valor for um objeto, converta-o em JSON antes de adicioná-lo
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }

  return formData;
}
