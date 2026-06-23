const sharp = (input: Buffer) => {
  const chain = {
    rotate: () => chain,
    resize: () => chain,
    jpeg: () => chain,
    metadata: async () => ({ pages: 1 }),
    toBuffer: async () => input,
  };
  return chain;
};

export default sharp;
