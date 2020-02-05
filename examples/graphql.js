const EPI2ME = require('..');

const profileName = process.argv[2] || 'production_signed';
const workflowId = process.argv[3] || '193480';
const profile = new EPI2ME.Profile().profile(profileName);
const api = new EPI2ME(profile);

api.graphQL
  .workflows()
  .then(console.info)
  .catch(console.error);

api.graphQL
  .workflowInstance({ variables: { idWorkflowInstance: workflowId } })
  .then(console.info)
  .catch(console.error);

api.graphQL
  .query(
    `query aWorkflow {
      workflow(idWorkflow:1800) {
        config
        idWorkflow
      }
    }
  `,
  )()
  .then(console.info)
  .catch(console.error);

api.graphQL
  .workflowPages(1)
  .then(allWorkflows => {
    console.info(allWorkflows.data);
    allWorkflows.next().then(console.info);
  })
  .catch(console.error);

api.graphQL
  .workflowInstances({ variables: { pageSize: 1 }, options: { fetchPolicy: 'network-only' } })
  .then(console.log)
  .catch(console.error);
