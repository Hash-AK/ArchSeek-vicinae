import {
	Action,
	ActionPanel,
	Icon,
	List,
	showToast,
	Toast,
} from "@vicinae/api";


export default function ArchSeek() {
    return(
        <List searchBarPlaceholder="Enter a search term to start">
			<List.Item title="Open the Arch Wiki" icon="Arch_Linux_logo.svg" actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy url to clipboard" content="https://wiki.archlinux.org/title/Main_page" />
					<Action.OpenInBrowser title="Open in browser" url="https://wiki.archlinux.org/title/Main_page"/>
				</ActionPanel>
			}
			/>
			</List>
	
    );

}