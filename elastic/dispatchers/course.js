exports.indices = () => {
  return {
    mappings: {
      properties: {
        id: {
          type: 'keyword',
        },
        name: {
          type: 'text',
          fields: {
            search_as_you_type: {
              type: 'search_as_you_type',
              max_shingle_size: 4,
            },
            completion: {
              type: 'completion',
            },
            keyword: {
              type: 'keyword',
            },
          },
        },
        category: {
          type: 'text',
          fields: {
            search_as_you_type: {
              type: 'search_as_you_type',
            },
            completion: {
              type: 'completion',
            },
            keyword: {
              type: 'keyword',
            },
          },
        },
      },
    },
  };
};

exports.transformDocument = async ({ payload }, { ctxData, utils, helpers }) => {
  return {
    id: payload.id,
    name: payload.name,
    category: (() => {
      const names = [
        ...helpers.flattenGet(payload, 'categories.category.display_name_en_US'),
        ...helpers.flattenGet(payload, 'categories.category.display_name_vi_VN'),
      ];
      const rtn = names.flatMap((val) => {
        return [val, `learn ${val} online`, `hoc ${val} online`, `khoa ${val} online`, `${val} online`];
      });
      return rtn;
    })(),
  };
};
