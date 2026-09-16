import {
	Action,
	ActionPanel,
	Icon,
	List,
	showToast,
	Toast,
	Color,
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
import TurndownService, * as Turndown from "turndown"
var turndownService = new TurndownService()
/*export async function getWikiPage() : Promise<string> {
	//return "Hello World"
	useEffect(() => {
		fetch('https://wiki.archlinux.org/title/Main_page').then((response) =>{ return response.text();})
	}).then((data) => {return data})
	
	
}
	*/
function useWikiPage(){
	const [wikiText, setWikiText] = useState<string>("Loading content...")
	useEffect(() => {
		fetch('https://wiki.archlinux.org/api.php?action=parse&page=Main_page&format=json&prop=text&explaintext=1').then((response) => {
			if (!response.ok) {
				throw new Error('Failed to fetch the page: ${response.status}');
			}
			return response.text();
		}).then((data: string) => {
			setWikiText(data)
		})
	},[])
	return wikiText
}

export default function ArchSeek() {
	const wikiText = useWikiPage()
    return(
        <List isShowingDetail searchBarPlaceholder="Enter a search term to start">
			<List.Item title="Open the Arch Wiki" icon="Arch_Linux_logo.svg" actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy url to clipboard" content="https://wiki.archlinux.org/title/Main_page" />
					<Action.OpenInBrowser title="Open in browser" url="https://wiki.archlinux.org/title/Main_page"/>
				</ActionPanel>
			} detail={
			<List.Item.Detail markdown={"# The Arch Wiki \n\n\n" + turndownService.turndown(wikiText.replaceAll("\\n","\n"))} />
			} />
			<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
			</List>
	
    );
	}

