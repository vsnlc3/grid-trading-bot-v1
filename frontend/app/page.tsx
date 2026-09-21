import { BotStoreProvider } from "@/components/dashboard/bot-store"
import { DashboardHeader } from "@/components/dashboard/header"
import { ChartPanel } from "@/components/dashboard/chart-panel"
import { BotControl } from "@/components/dashboard/bot-control"
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary"
import { PaperAccount } from "@/components/dashboard/paper-account"
import { BotSettings } from "@/components/dashboard/bot-settings"
import { BottomPanel } from "@/components/dashboard/bottom-panel"

export default function Page() {
  return (
    <BotStoreProvider>
      <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-background text-foreground">
        <DashboardHeader />
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-h-[360px] flex-col">
              <ChartPanel />
            </div>
            <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-1 xl:pr-1">
              <BotControl />
              <PortfolioSummary />
              <PaperAccount />
              <BotSettings />
            </aside>
          </div>
          <BottomPanel />
        </main>
      </div>
    </BotStoreProvider>
  )
}
