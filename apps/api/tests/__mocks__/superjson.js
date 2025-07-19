module.exports = {
  default: {
    serialize: (data) => data,
    deserialize: (data) => data,
    stringify: (data) => JSON.stringify(data),
    parse: (data) => JSON.parse(data),
  },
  serialize: (data) => data,
  deserialize: (data) => data,
  stringify: (data) => JSON.stringify(data),
  parse: (data) => JSON.parse(data),
};