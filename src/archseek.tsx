import {
	Action,
	ActionPanel,
	Icon,
	List,
	showToast,
	Toast,
	Color,
} from "@vicinae/api";

export function getWikiPage() : string {
	return "Hello World"
}
export default function ArchSeek() {
    return(
        <List isShowingDetail searchBarPlaceholder="Enter a search term to start">
			<List.Item title="Open the Arch Wiki" icon="Arch_Linux_logo.svg" actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy url to clipboard" content="https://wiki.archlinux.org/title/Main_page" />
					<Action.OpenInBrowser title="Open in browser" url="https://wiki.archlinux.org/title/Main_page"/>
				</ActionPanel>
			} detail={
			<List.Item.Detail markdown={("# The Arch Wiki \n" + getWikiPage())} />
			} />
			<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
			</List>
	
    );

}
