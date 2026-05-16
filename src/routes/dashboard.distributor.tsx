import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/distributor')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/distributor"!</div>
}
