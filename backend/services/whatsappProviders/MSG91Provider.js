class MSG91Provider {
  constructor(config = {}) {
    this.config = config;
    this.name = "msg91";
  }

  async sendBillingMessage() {
    throw new Error("MSG91Provider is a Phase 2 abstraction placeholder.");
  }
}

module.exports = MSG91Provider;
